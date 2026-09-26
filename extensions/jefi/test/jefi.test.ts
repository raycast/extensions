import { chmodSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeAll, describe, expect, test } from 'vitest'
import { cliRunner, DEFAULT_JEFI_PATH, jefiClient, JefiError, links, resolveJefiPath } from '../src/lib/jefi'

const fake = join(__dirname, '..', 'fixtures', 'fake-jefi.mjs')
const c = jefiClient(cliRunner(fake))

beforeAll(() => chmodSync(fake, 0o755))
afterEach(() => {
  delete process.env.FAKE_JEFI_ERROR
  delete process.env.FAKE_JEFI_EMPTY
  delete process.env.JEFI_CLI
})

describe('client against the fake CLI', () => {
  test('inbox returns contract-shaped threads', async () => {
    const threads = await c.inbox({ limit: 2 })
    expect(threads).toHaveLength(2)
    expect(threads[0]).toMatchObject({ id: 't1', from: { email: 'nora@example.com' }, url: 'jefi://thread/t1' })
  })

  test('search passes the query and account filter through', async () => {
    expect((await c.search('invoice')).map((t) => t.id)).toEqual(['t1'])
    expect(await c.inbox({ account: 'a2' })).toHaveLength(1)
  })

  test('today, invites, unread, notes', async () => {
    const events = await c.today()
    expect(events[0].meetingUrl).toMatch(/^https:/)
    expect(typeof events[0].occurrenceStart).toBe('number')
    expect((await c.invites())[0].eventId).toBe('e9')
    expect((await c.unread()).total).toBe(2)
    expect((await c.notes({ query: 'offsite' })).map((n) => n.id)).toEqual(['n1'])
  })

  test('empty results', async () => {
    process.env.FAKE_JEFI_EMPTY = '1'
    expect(await c.inbox()).toEqual([])
    expect((await c.unread()).total).toBe(0)
  })

  test('a CLI error surfaces its { error } message', async () => {
    process.env.FAKE_JEFI_ERROR = 'mail.db is locked'
    const err = await c.inbox().catch((e) => e)
    expect(err).toBeInstanceOf(JefiError)
    expect(err).toMatchObject({ kind: 'cli', message: 'mail.db is locked' })
  })

  test('a missing executable is "not installed"', async () => {
    const err = await jefiClient(cliRunner('/nonexistent/Jefi')).version().catch((e) => e)
    expect(err).toMatchObject({ kind: 'not-installed' })
  })
})

test('resolveJefiPath: env beats preference beats default', () => {
  expect(resolveJefiPath()).toBe(DEFAULT_JEFI_PATH)
  expect(resolveJefiPath('  ')).toBe(DEFAULT_JEFI_PATH)
  expect(resolveJefiPath('/opt/Jefi')).toBe('/opt/Jefi')
  process.env.JEFI_CLI = fake
  expect(resolveJefiPath('/opt/Jefi')).toBe(fake)
})

test('jefi:// links encode values and drop empty ones', () => {
  expect(links.compose({ to: 'a@b.c', subject: 'Hi & bye', body: '', cc: undefined })).toBe(
    'jefi://compose?to=a%40b.c&subject=Hi%20%26%20bye',
  )
  expect(links.compose({})).toBe('jefi://compose')
  expect(links.quickAdd('Lunch Friday 1pm')).toBe('jefi://quick-add?text=Lunch%20Friday%201pm')
  expect(links.event('e1', 1700000000000)).toBe('jefi://event/e1?start=1700000000000')
  expect(links.event('e1')).toBe('jefi://event/e1')
  expect(links.inbox('a/1')).toBe('jefi://inbox/a%2F1')
  expect(links.newNote({ title: 'T', body: 'line\nnext' })).toBe('jefi://new-note?title=T&body=line%0Anext')
  expect(links.search('from:nora')).toBe('jefi://search?q=from%3Anora')
})
