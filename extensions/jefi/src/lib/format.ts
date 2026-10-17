// Pure formatting and ordering helpers, kept apart from the views so they can be unit-tested.
import type { Invite, JefiEvent, Thread } from './jefi'

const pad = (n: number) => String(n).padStart(2, '0')

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function clock(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Mail list accessory: time today, weekday this week, otherwise a short date.
export function mailDate(iso: string, now = new Date()): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  if (sameDay(d, now)) return clock(d)
  const days = (now.getTime() - d.getTime()) / 86_400_000
  if (days > 0 && days < 6) return d.toLocaleDateString('en-US', { weekday: 'short' })
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric'
  return d.toLocaleDateString('en-US', opts)
}

export function eventTime(e: Pick<JefiEvent, 'start' | 'end' | 'allDay'>): string {
  if (e.allDay) return 'All day'
  return `${clock(new Date(e.start))}–${clock(new Date(e.end))}`
}

export function senderName(t: Pick<Thread, 'from'>): string {
  return t.from.name?.trim() || t.from.email || 'Unknown sender'
}

// Inbox: unread first, then newest first within each group. Stable for equal dates.
export function unreadFirst(threads: Thread[]): Thread[] {
  return [...threads].sort((a, b) => {
    if (a.unread !== b.unread) return a.unread ? -1 : 1
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
}

// The next timed event that hasn't ended; an in-progress meeting counts so the menu bar can say "now".
export function nextEvent(events: JefiEvent[], now = new Date()): JefiEvent | undefined {
  return events
    .filter((e) => !e.allDay && new Date(e.end).getTime() > now.getTime())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0]
}

export function untilLabel(e: Pick<JefiEvent, 'start'>, now = new Date()): string {
  const mins = Math.round((new Date(e.start).getTime() - now.getTime()) / 60_000)
  if (mins <= 0) return 'now'
  if (mins < 60) return `in ${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `in ${h} h ${m} min` : `in ${h} h`
}

export function menuBarTitle(total: number | undefined): string | undefined {
  if (!total) return undefined
  return total > 999 ? '999+' : String(total)
}

export function inviteWhen(i: Invite, now = new Date()): string {
  const d = new Date(i.start)
  const day = sameDay(d, now)
    ? 'Today'
    : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return i.allDay ? day : `${day} ${clock(d)}`
}

export function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}
