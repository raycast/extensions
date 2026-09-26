#!/usr/bin/env node
// Stand-in for `Jefi cli <cmd> --json` (docs/integrations.md §2), for tests and for developing the
// extension without the app: set the "Jefi Executable" preference, or JEFI_CLI, to this file.
// FAKE_JEFI_ERROR=<message> makes every command fail the way the real CLI does; FAKE_JEFI_EMPTY=1
// returns empty lists.
const [, , mode, cmd, ...rest] = process.argv
const json = rest.includes('--json')

function out(value, code = 0) {
  process.stdout.write(json ? JSON.stringify(value) : String(value))
  process.exit(code)
}

if (mode !== 'cli') out({ error: 'expected `cli` as the first argument' }, 1)
if (process.env.FAKE_JEFI_ERROR) out({ error: process.env.FAKE_JEFI_ERROR }, 1)
const empty = process.env.FAKE_JEFI_EMPTY === '1'

const flag = (name) => {
  const i = rest.indexOf(`--${name}`)
  return i === -1 ? undefined : rest[i + 1]
}

const now = new Date()
const at = (h, m = 0) => {
  const d = new Date(now)
  d.setHours(h, m, 0, 0)
  return d
}
const iso = (d) => d.toISOString()
const ago = (mins) => iso(new Date(now.getTime() - mins * 60_000))

const threads = [
  { id: 't1', accountId: 'a1', subject: 'Invoice #2041', from: { name: 'Nora Lind', email: 'nora@example.com' }, snippet: 'Attached is the invoice for September.', date: ago(20), unread: true, starred: false, hasAttachments: true },
  { id: 't2', accountId: 'a1', subject: 'Re: Launch plan', from: { name: 'Sam Ortiz', email: 'sam@example.com' }, snippet: 'Looks good, one change to the timeline.', date: ago(300), unread: false, starred: true, hasAttachments: false },
  { id: 't3', accountId: 'a2', subject: 'Your weekly digest', from: { name: '', email: 'digest@news.example' }, snippet: 'Top stories this week.', date: ago(60 * 30), unread: true, starred: false, hasAttachments: false },
].map((t) => ({ ...t, url: `jefi://thread/${t.id}` }))

const events = [
  { id: 'e1', title: 'Standup', start: at(9, 30), end: at(9, 45), allDay: false, location: 'https://meet.google.com/abc-defg-hij', meetingUrl: 'https://meet.google.com/abc-defg-hij' },
  { id: 'e2', title: 'Lunch with Nora', start: at(13), end: at(14), allDay: false, location: 'Café Nord', meetingUrl: null },
  { id: 'e3', title: 'Company offsite', start: at(0), end: at(23, 59), allDay: true, location: null, meetingUrl: null },
].map((e) => ({
  ...e,
  occurrenceStart: e.start.getTime(),
  start: iso(e.start),
  end: iso(e.end),
  calendar: { id: 'c1', name: 'Work', color: '#3b82f6' },
  url: `jefi://event/${e.id}?start=${e.start.getTime()}`,
}))

const notes = [
  { id: 'n1', title: 'Offsite agenda', snippet: 'Morning: roadmap. Afternoon: hiring.', updatedAt: ago(90), links: [] },
  { id: 'n2', title: 'Reading list', snippet: 'A Philosophy of Software Design', updatedAt: ago(60 * 48), links: [] },
]

const limit = (list) => list.slice(0, Number(flag('limit') ?? list.length))
const match = (q) => (s) => s.toLowerCase().includes(q.toLowerCase())

switch (cmd) {
  case 'version':
    out({ version: '0.0.0-fake' })
  case 'accounts':
    out([
      { id: 'a1', name: 'Work', email: 'me@work.example' },
      { id: 'a2', name: 'Personal', email: 'me@home.example' },
    ])
  case 'unread':
    out(empty ? { total: 0, accounts: [] } : { total: 2, accounts: [{ id: 'a1', email: 'me@work.example', unread: 1 }, { id: 'a2', email: 'me@home.example', unread: 1 }] })
  case 'inbox':
    out(empty ? [] : limit(threads.filter((t) => !flag('account') || t.accountId === flag('account'))))
  case 'search': {
    const q = rest[0] ?? ''
    out(empty ? [] : limit(threads.filter((t) => [t.subject, t.snippet, t.from.name, t.from.email].some(match(q)))))
  }
  case 'today':
  case 'agenda':
    out(empty ? [] : events)
  case 'invites':
    out(empty ? [] : [{ eventId: 'e9', title: 'Design review', start: iso(at(16)), end: iso(at(17)), allDay: false, organizer: { name: 'Sam Rivera', email: 'sam@example.com' }, accountId: 'a1', threadId: 't2' }])
  case 'notes': {
    const q = flag('query')
    out(empty ? [] : limit(q ? notes.filter((n) => [n.title, n.snippet].some(match(q))) : notes))
  }
  default:
    out({ error: `unknown command: ${cmd}` }, 1)
}
