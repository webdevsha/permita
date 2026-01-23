"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, User, MapPin, Search, Copy, Check, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { toast } from "sonner"
import useSWR from "swr"
import { createClient } from "@/utils/supabase/client"

const fetchOrganizers = async () => {
  const supabase = createClient()
  
  // Fetch from the new dedicated table
  const { data: orgs, error } = await supabase
    .from('organizers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  
  // Enrich with location count
  const enriched = await Promise.all(orgs.map(async (o) => {
      // Note: locations.organizer_id now matches organizers.id
      const { count } = await supabase
        .from('locations')
        .select('*', { count: 'exact', head: true })
        .eq('organizer_id', o.id)
      return { ...o, locationCount: count || 0 }
  }))
  
  return enriched
}

export function OrganizerList() {
  const { data: organizers, error, isLoading, mutate } = useSWR('organizers_list_v2', fetchOrganizers)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const supabase = createClient()

  const [newOrganizer, setNewOrganizer] = useState({
    name: "",
    email: "",
    code: ""
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(text)
    toast.success("Kod disalin!")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCreateOrganizer = async () => {
    if (!newOrganizer.name || !newOrganizer.email) {
      toast.error("Sila isi Nama dan Emel")
      return
    }

    setIsCreating(true)
    try {
      // Auto-generate code if not provided
      let code = newOrganizer.code
      if (!code) {
         const nextNum = (organizers?.length || 0) + 1
         code = `Organizer-${nextNum + 10}` // Start from 10 to avoid conflict with dummies
      }

      const { error } = await supabase.from('organizers').insert({
        name: newOrganizer.name,
        email: newOrganizer.email,
        organizer_code: code,
        status: 'active'
      })

      if (error) throw error

      toast.success(`Penganjur berjaya ditambah: ${code}`)
      setIsDialogOpen(false)
      setNewOrganizer({ name: "", email: "", code: "" })
      mutate()
    } catch (e: any) {
      toast.error("Ralat: " + e.message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
     if(!confirm("Adakah anda pasti?")) return
     const { error } = await supabase.from('organizers').delete().eq('id', id)
     if (error) toast.error(error.message)
     else {
        toast.success("Penganjur dipadam")
        mutate()
     }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-foreground">Pengurusan Penganjur</h2>
          <p className="text-muted-foreground">Senarai penganjur dan kod rujukan</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-2xl h-12 px-6">
              <Plus className="mr-2 h-5 w-5" />
              Daftar Penganjur
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-white rounded-3xl">
            <DialogHeader>
              <DialogTitle>Daftar Penganjur Baru</DialogTitle>
              <DialogDescription>
                Wujudkan rekod penganjur baru.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nama Penganjur / Syarikat</Label>
                <Input
                  id="name"
                  value={newOrganizer.name}
                  onChange={(e) => setNewOrganizer({ ...newOrganizer, name: e.target.value })}
                  className="rounded-xl"
                  placeholder="e.g. Ali Baba Events"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Emel</Label>
                <Input
                  id="email"
                  type="email"
                  value={newOrganizer.email}
                  onChange={(e) => setNewOrganizer({ ...newOrganizer, email: e.target.value })}
                  className="rounded-xl"
                  placeholder="ali@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="code">Kod Penganjur (Pilihan)</Label>
                <Input
                  id="code"
                  value={newOrganizer.code}
                  onChange={(e) => setNewOrganizer({ ...newOrganizer, code: e.target.value })}
                  className="rounded-xl"
                  placeholder="Biarkan kosong untuk auto-generate"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateOrganizer} disabled={isCreating} className="w-full rounded-xl h-11">
                {isCreating ? <Loader2 className="animate-spin" /> : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 shadow-sm bg-white rounded-[2rem] overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow>
                  <TableHead className="pl-6">Kod Penganjur</TableHead>
                  <TableHead>Nama Penganjur</TableHead>
                  <TableHead>Emel</TableHead>
                  <TableHead className="text-center">Lokasi Diuruskan</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right pr-6">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizers?.map((org: any) => (
                  <TableRow key={org.id} className="hover:bg-secondary/10">
                     <TableCell className="pl-6 font-mono font-bold text-primary">
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => copyToClipboard(org.organizer_code)}>
                             {org.organizer_code}
                             {copiedId === org.organizer_code ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-50" />}
                        </div>
                     </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <User size={16} />
                        </div>
                        {org.name}
                      </div>
                    </TableCell>
                    <TableCell>{org.email}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-secondary">
                        <MapPin className="w-3 h-3 mr-1" />
                        {org.locationCount} Lokasi
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-brand-green/10 text-brand-green hover:bg-brand-green/20 border-none capitalize">
                        {org.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                       <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(org.id)}>
                          <Trash2 size={16} />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {organizers?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      Tiada penganjur didaftarkan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
