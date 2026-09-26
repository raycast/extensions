// Typed client for the `Jefi cli <cmd> --json` contract (docs/integrations.md §2) and the jefi://
// routes (§1). No @raycast/api import here so it runs under plain Node in tests.
import { execFile } from 'node:child_process'

export const DEFAULT_JEFI_PATH = '/Applications/Jefi.app/Contents/MacOS/Jefi'

export type Person = { name: string; email: string }

export type Thread = {
  id: string
  accountId: string
  subject: string
  from: Person
  snippet: string
  date: string
  unread: boolean
  starred: boolean
  hasAttachments: boolean
  url: string
}

export type JefiEvent = {
  id: string
  occurrenceStart: number
  title: string
  start: string
  end: string
  allDay: boolean
  location: string | null
  calendar: { id: string; name: string; color: string }
  meetingUrl: string | null
  url: string
}

export type Invite = {
  eventId: string
  title: string
  start: string
  end: string
  allDay: boolean
  organizer: { name: string; email: string } | null
  accountId: string
  threadId: string | null
}

export type NoteSummary = { id: string; title: string; snippet: string; updatedAt: string; links?: unknown }
export type Account = { id: string; name: string; email: string }
export type Unread = { total: number; accounts: { id: string; email: string; unread: number }[] }

// Why a call failed, so views can show the right empty state rather than a raw error.
export class JefiError extends Error {
  constructor(
    readonly kind: 'not-installed' | 'cli',
    message: string,
  ) {
    super(message)
    this.name = 'JefiError'
  }
}

export type RunCli = (args: string[]) => Promise<unknown>

// The JEFI_CLI env var wins over the preference so tests and `npm run dev` can point at the fake CLI
// (fixtures/fake-jefi.mjs) without touching Raycast preferences.
export function resolveJefiPath(pref?: string): string {
  return process.env.JEFI_CLI?.trim() || pref?.trim() || DEFAULT_JEFI_PATH
}

export function cliRunner(path: string, timeout = 15000): RunCli {
  return (args) =>
    new Promise((resolve, reject) => {
      execFile(path, ['cli', ...args, '--json'], { timeout, maxBuffer: 32 * 1024 * 1024 }, (err, stdout) => {
        const code = (err as NodeJS.ErrnoException | null)?.code
        if (code === 'ENOENT' || code === 'EACCES') {
          reject(new JefiError('not-installed', `Jefi wasn't found at ${path}`))
          return
        }
        // With --json an error is still `{ error }` on stdout, so parse before looking at the exit code.
        let parsed: unknown
        try {
          parsed = JSON.parse(String(stdout))
        } catch {
          reject(new JefiError('cli', err ? err.message : 'Jefi returned output that isn’t JSON'))
          return
        }
        if (parsed && typeof parsed === 'object' && 'error' in parsed && !Array.isArray(parsed)) {
          reject(new JefiError('cli', String((parsed as { error: unknown }).error)))
          return
        }
        if (err) {
          reject(new JefiError('cli', err.message))
          return
        }
        resolve(parsed)
      })
    })
}

function opt(name: string, value: string | number | undefined): string[] {
  return value === undefined || value === '' ? [] : [`--${name}`, String(value)]
}

export function jefiClient(run: RunCli) {
  return {
    accounts: () => run(['accounts']) as Promise<Account[]>,
    unread: () => run(['unread']) as Promise<Unread>,
    search: (query: string, o: { limit?: number; account?: string } = {}) =>
      run(['search', query, ...opt('limit', o.limit), ...opt('account', o.account)]) as Promise<Thread[]>,
    inbox: (o: { limit?: number; account?: string } = {}) =>
      run(['inbox', ...opt('limit', o.limit), ...opt('account', o.account)]) as Promise<Thread[]>,
    today: () => run(['today']) as Promise<JefiEvent[]>,
    agenda: (days?: number) => run(['agenda', ...opt('days', days)]) as Promise<JefiEvent[]>,
    invites: () => run(['invites']) as Promise<Invite[]>,
    notes: (o: { limit?: number; query?: string } = {}) =>
      run(['notes', ...opt('limit', o.limit), ...opt('query', o.query)]) as Promise<NoteSummary[]>,
    version: () => run(['version']) as Promise<{ version: string }>,
  }
}

export type JefiClient = ReturnType<typeof jefiClient>

// jefi:// builders. Empty values are dropped so Jefi's prefill sees only what the person typed.
function withQuery(base: string, params: Record<string, string | undefined>): string {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
    .join('&')
  return q ? `${base}?${q}` : base
}

export const links = {
  inbox: (accountId?: string) =>
    accountId ? `jefi://inbox/${encodeURIComponent(accountId)}` : 'jefi://inbox',
  thread: (id: string) => `jefi://thread/${encodeURIComponent(id)}`,
  search: (q: string) => withQuery('jefi://search', { q }),
  compose: (p: {
    to?: string
    cc?: string
    bcc?: string
    subject?: string
    body?: string
    account?: string
  }) => withQuery('jefi://compose', p),
  calendar: (date?: string) => withQuery('jefi://calendar', { date }),
  event: (id: string, start?: number) =>
    withQuery(`jefi://event/${encodeURIComponent(id)}`, {
      start: start === undefined ? undefined : String(start),
    }),
  quickAdd: (text: string) => withQuery('jefi://quick-add', { text }),
  notes: () => 'jefi://notes',
  note: (id: string) => `jefi://note/${encodeURIComponent(id)}`,
  newNote: (p: { title?: string; body?: string }) => withQuery('jefi://new-note', p),
}
