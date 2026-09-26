import { expect, test } from 'vitest'
import { eventTime, mailDate, menuBarTitle, nextEvent, senderName, truncate, unreadFirst, untilLabel } from '../src/lib/format'
import type { JefiEvent, Thread } from '../src/lib/jefi'

const now = new Date(2026, 8, 26, 12, 0) // Sat 26 Sep 2026, noon local
const local = (d: number, h: number, m = 0) => new Date(2026, 8, d, h, m).toISOString()

const thread = (id: string, unread: boolean, date: string): Thread => ({
  id,
  accountId: 'a',
  subject: id,
  from: { name: '', email: `${id}@x.y` },
  snippet: '',
  date,
  unread,
  starred: false,
  hasAttachments: false,
  url: `jefi://thread/${id}`,
})

const event = (id: string, start: string, end: string, allDay = false): JefiEvent => ({
  id,
  occurrenceStart: new Date(start).getTime(),
  title: id,
  start,
  end,
  allDay,
  location: null,
  calendar: { id: 'c', name: 'Work', color: '#000' },
  meetingUrl: null,
  url: '',
})

test('mailDate: time today, weekday this week, date otherwise', () => {
  expect(mailDate(local(26, 9, 5), now)).toBe('09:05')
  expect(mailDate(local(24, 9), now)).toBe('Thu')
  expect(mailDate(local(1, 9), now)).toBe('Sep 1')
  expect(mailDate(new Date(2025, 0, 2).toISOString(), now)).toBe('Jan 2, 2025')
  expect(mailDate('garbage', now)).toBe('')
})

test('eventTime and all-day', () => {
  expect(eventTime(event('e', local(26, 9, 30), local(26, 10)))).toBe('09:30–10:00')
  expect(eventTime(event('e', local(26, 0), local(27, 0), true))).toBe('All day')
})

test('unreadFirst keeps newest first within each group', () => {
  const sorted = unreadFirst([
    thread('old-read', false, local(20, 9)),
    thread('old-unread', true, local(20, 9)),
    thread('new-read', false, local(26, 9)),
    thread('new-unread', true, local(26, 9)),
  ])
  expect(sorted.map((t) => t.id)).toEqual(['new-unread', 'old-unread', 'new-read', 'old-read'])
})

test('nextEvent skips finished and all-day events, counts one in progress', () => {
  const events = [
    event('done', local(26, 9), local(26, 10)),
    event('allday', local(26, 0), local(27, 0), true),
    event('later', local(26, 15), local(26, 16)),
    event('now', local(26, 11, 45), local(26, 12, 30)),
  ]
  expect(nextEvent(events, now)?.id).toBe('now')
  expect(nextEvent([events[0]], now)).toBeUndefined()
})

test('untilLabel', () => {
  expect(untilLabel({ start: local(26, 11) }, now)).toBe('now')
  expect(untilLabel({ start: local(26, 12, 25) }, now)).toBe('in 25 min')
  expect(untilLabel({ start: local(26, 14) }, now)).toBe('in 2 h')
  expect(untilLabel({ start: local(26, 13, 30) }, now)).toBe('in 1 h 30 min')
})

test('menuBarTitle, senderName, truncate', () => {
  expect(menuBarTitle(0)).toBeUndefined()
  expect(menuBarTitle(7)).toBe('7')
  expect(menuBarTitle(1200)).toBe('999+')
  expect(senderName(thread('x', false, ''))).toBe('x@x.y')
  expect(truncate('abcdef', 4)).toBe('abc…')
  expect(truncate('abc', 4)).toBe('abc')
})
