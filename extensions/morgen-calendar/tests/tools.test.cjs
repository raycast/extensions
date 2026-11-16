const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');
const calendar = { id: 'cal', accountId: 'account', name: 'Work', myRights: { mayWriteOwn: true } };
const ref = load('src/lib/calendar-reference.ts').calendarReference;
const input = { calendarRef: ref(calendar), title: ' Focus ', start: '2026-10-01T10:00:00', timeZone: 'America/Argentina/Cordoba', durationMinutes: 45 };

test('creation preview does not write; execution sends only the approved fields', async () => {
  const calls = [];
  const tool = load('src/tools/create-event.ts', { '@raycast/api': {}, '../lib/morgen': {
    listCalendars: async () => [calendar], createEvent: async (payload) => { calls.push(payload); return { id: 'event' }; },
  }});
  const preview = await tool.confirmation(input);
  assert.match(preview.info.find((item) => item.name === 'Start').value, /America\/Argentina\/Cordoba/);
  assert.equal(calls.length, 0);
  assert.equal((await tool.default(input)).id, 'event');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), { accountId: 'account', calendarId: 'cal', title: 'Focus', start: input.start, duration: 'PT45M', timeZone: input.timeZone, showWithoutTime: false });
});

test('invalid dates, timezone, duration, and read-only or wrong-account calendars never write', async () => {
  let writes = 0;
  const tool = load('src/tools/create-event.ts', { '@raycast/api': {}, '../lib/morgen': {
    listCalendars: async () => [calendar, { ...calendar, id: 'readonly', myRights: {} }],
    createEvent: async () => { writes++; },
  }});
  for (const patch of [{ title: ' ' }, { start: '2026-02-30T10:00:00' }, { start: input.start + 'Z' }, { timeZone: 'Imaginary/Zone' }, { durationMinutes: 0 }, { durationMinutes: 1.5 }, { calendarRef: 'wrong' }, { calendarRef: ref({ ...calendar, id: 'readonly' }) }]) {
    await assert.rejects(tool.default({ ...input, ...patch }));
  }
  assert.equal(writes, 0);
});

test('search groups accounts, preserves timezone, and filters title', async () => {
  const calls = [];
  const tool = load('src/tools/find-events.ts', { '../lib/morgen': {
    listCalendars: async () => [calendar, { ...calendar, accountId: 'other', name: 'Personal' }],
    readEvents: async (accountId, ids) => { calls.push([accountId, ...ids]); return [{ calendarId: 'cal', title: 'Focus', start: input.start, timeZone: input.timeZone }, { calendarId: 'cal', title: 'Lunch' }]; },
  }});
  const result = await tool.default({ start: '2026-10-01T00:00:00-03:00', end: '2026-10-02T00:00:00-03:00', query: 'FOCUS' });
  assert.equal(calls.length, 2);
  assert.equal(result.events.length, 2);
  assert.equal(result.events[1].calendarName, 'Personal');
  assert.equal(result.events[0].timeZone, input.timeZone);
  await assert.rejects(tool.default({ start: input.start, end: input.start }));
  await assert.rejects(tool.default({ start: '2026-01-01T00:00:00Z', end: '2026-10-01T00:00:00Z' }));
});

test('search failures propagate rather than implying an empty calendar', async () => {
  const tool = load('src/tools/find-events.ts', { '../lib/morgen': {
    listCalendars: async () => [calendar], readEvents: async () => { throw new Error('Unavailable'); },
  }});
  await assert.rejects(tool.default({ start: '2026-10-01T00:00:00Z', end: '2026-10-02T00:00:00Z' }), /Unavailable/);
});

test('API unwraps created event and rejects success responses missing its ID', async () => {
  let response = { data: { event: { id: 'created', title: 'Focus' } } };
  const api = load('src/lib/morgen.ts', { '@raycast/api': { getPreferenceValues: () => ({ apiKey: 'test' }), showToast: async () => {}, Toast: { Style: { Failure: 'failure' } } } }, {
    fetch: async url => ({ ok: true, text: async () => JSON.stringify(url.includes('calendars') ? { data: { calendars: [calendar] } } : response) }),
  });
  assert.equal((await api.createEvent({ accountId: calendar.accountId, calendarId: calendar.id, title: 'Focus', start: input.start, timeZone: input.timeZone, duration: 'PT45M', showWithoutTime: false })).id, 'created');
  response = { data: {} };
  await assert.rejects(api.createEvent({ accountId: calendar.accountId, calendarId: calendar.id, title: 'Focus', start: input.start, timeZone: input.timeZone, duration: 'PT45M', showWithoutTime: false }), /Check Morgen before retrying/);
});




test('list commands distinguish failed reads from empty calendars', () => {
  for (const file of ['src/list-today-events.tsx', 'src/search-events.tsx']) {
    for (const failed of [true, false]) {
      const states = file.includes('search') ? [[], '', false, failed] : [[], false, failed];
      const List = Object.assign(() => {}, { EmptyView: 'EmptyView' });
      const command = load(file, {
        '@raycast/api': { List, Icon: {} },
        react: { useState: () => [states.shift(), () => {}], useEffect: () => {} },
        'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
        './utils': {}, './event-actions': {},
      });
      const empty = command.default().props.children;
      assert.equal(empty.props.title, failed ? 'Unable to Load Events' : file.includes('search') ? 'No Events Found' : 'No Events Today');
      if (failed) assert.match(empty.props.description, /availability is unknown/);
    }
  }
});

test('London event displays the same instant as its UTC timestamp', () => {
  const utils = load('src/utils.ts', { '@raycast/api': {}, './lib/morgen': {}, '@js-temporal/polyfill': require('@js-temporal/polyfill') });
  assert.equal(utils.formatTime('2026-10-01T10:00:00', 'Europe/London'), utils.formatTime('2026-10-01T09:00:00Z'));
});

test('event dates resolve foreign zones, DST transitions, and explicit offsets', () => {
  const utils = load('src/utils.ts', { '@raycast/api': {}, './lib/morgen': {}, '@js-temporal/polyfill': require('@js-temporal/polyfill') });
  const cases = [
    ['2026-10-01T10:00:00', 'Europe/London', '2026-10-01T09:00:00Z'],
    ['2026-10-01T01:00:00', 'Asia/Tokyo', '2026-09-30T16:00:00Z'],
    ['2026-01-15T10:00:00', 'America/New_York', '2026-01-15T15:00:00Z'],
    ['2026-07-15T10:00:00', 'America/New_York', '2026-07-15T14:00:00Z'],
    ['2026-03-08T01:30:00', 'America/New_York', '2026-03-08T06:30:00Z'],
    ['2026-03-08T03:30:00', 'America/New_York', '2026-03-08T07:30:00Z'],
    // Compatible disambiguation: move gaps forward; choose first overlap occurrence.
    ['2026-03-08T02:30:00', 'America/New_York', '2026-03-08T07:30:00Z'],
    ['2026-11-01T01:30:00', 'America/New_York', '2026-11-01T05:30:00Z'],
    ['2026-11-01T01:30:00-05:00', 'America/New_York', '2026-11-01T06:30:00Z'],
  ];
  for (const [start, zone, utc] of cases) {
    assert.equal(utils.eventDate(start, zone).toISOString(), new Date(utc).toISOString());
    assert.equal(utils.formatTime(start, zone), utils.formatTime(utc));
    assert.equal(utils.formatDateTime(start, zone), utils.formatDateTime(utc));
  }
  assert.equal(utils.eventDate('2026-10-01T10:00:00', null).getTime(), new Date('2026-10-01T10:00:00').getTime());
  assert.equal(utils.computeDuration('2026-03-08T01:30:00', '2026-03-08T03:30:00', undefined, 'America/New_York'), '1h');
});

test('events sort by actual instant across calendars and timezones', async () => {
  const utils = load('src/utils.ts', {
    '@raycast/api': {}, '@js-temporal/polyfill': require('@js-temporal/polyfill'),
    './lib/morgen': {
      listCalendars: async () => [calendar],
      readEvents: async () => [
        { id: 'later', calendarId: 'cal', start: '2026-10-01T09:00:00', timeZone: 'America/New_York' },
        { id: 'earlier', calendarId: 'cal', start: '2026-10-01T10:00:00', timeZone: 'Asia/Tokyo' },
      ],
    },
  });
  const result = await utils.fetchEventsForRange('2026-10-01T00:00:00Z', '2026-10-02T00:00:00Z');
  assert.equal(result[0].id, 'earlier');
});

test('AI creation rejects DST gaps and overlaps before preview or mutation', async () => {
  let reads = 0, writes = 0;
  const tool = load('src/tools/create-event.ts', { '@raycast/api': {}, '../lib/morgen': {
    listCalendars: async () => { reads++; return [calendar]; },
    createEvent: async () => { writes++; },
  }});
  for (const start of ['2026-03-08T02:30:00', '2026-11-01T01:30:00']) {
    const value = { ...input, start, timeZone: 'America/New_York' };
    await assert.rejects(tool.confirmation(value));
    await assert.rejects(tool.default(value));
  }
  assert.equal(reads, 0); assert.equal(writes, 0);
});

test('AI search rejects impossible dates and does not expose unreadable or unrequested calendar results', async () => {
  let reads = 0;
  const tool = load('src/tools/find-events.ts', { '../lib/morgen': {
    listCalendars: async () => [calendar, { ...calendar, accountId: 'hidden', myRights: { mayReadItems: false } }],
    readEvents: async () => { reads++; return [
      { id: 'good', calendarId: 'cal', accountId: 'account', title: 'Focus' },
      { id: 'bad', calendarId: 'outside', accountId: 'account', title: 'Outside' },
      { id: 'bad-account', calendarId: 'cal', accountId: 'wrong', title: 'Wrong' },
    ]; },
  }});
  await assert.rejects(tool.default({ start: '2026-02-30T00:00:00Z', end: '2026-03-04T00:00:00Z' }));
  assert.equal(reads, 0);
  const result = await tool.default({ start: '2026-10-01T00:00:00Z', end: '2026-10-02T00:00:00Z' });
  assert.equal(reads, 1); assert.equal(result.events.length, 1); assert.equal(result.events[0].id, 'good');
});

test('AI calendar references distinguish duplicate names and IDs without exposing account IDs', async () => {
  const other = { ...calendar, accountId: 'other' };
  let calendars = [calendar, other];
  const service = { listCalendars: async () => calendars };
  const listing = load('src/tools/list-calendars.ts', { '../lib/morgen': service });
  const first = await listing.default();
  assert.equal(first.calendars.length, 2);
  assert.notEqual(first.calendars[0].calendarRef, first.calendars[1].calendarRef);
  for (const item of first.calendars) assert.deepEqual(Object.keys(item).sort(), ['calendarRef', 'canWrite', 'name']);
  calendars = [other, calendar];
  assert.equal((await listing.default()).calendars[1].calendarRef, first.calendars[0].calendarRef);
  const writes = [];
  const creation = load('src/tools/create-event.ts', { '../lib/morgen': { ...service,
    createEvent: async payload => { writes.push(payload); return { ...payload, id: 'new' }; },
  }});
  const value = { ...input, calendarRef: first.calendars[1].calendarRef };
  const preview = await creation.confirmation(value);
  assert.equal(preview.info.find(i => i.name === 'Calendar').value, calendar.name);
  const created = await creation.default(value);
  assert.equal(writes[0].accountId, 'other');
  assert.equal('accountId' in created, false); assert.equal('calendarId' in created, false);
  for (const calendarRef of ['unknown', calendar.id, calendar.name]) await assert.rejects(creation.default({ ...value, calendarRef }));
  calendars = [other, other];
  await assert.rejects(creation.default(value), /unique calendar reference/);
  calendars = [calendar];
  await assert.rejects(creation.default(value), /unique calendar reference/);
  calendars = [{ ...other, myRights: {} }];
  await assert.rejects(creation.default(value), /writable calendar/);
  assert.equal(writes.length, 1);
});

test('AI search outputs calendar references with no account or raw calendar IDs', async () => {
  const tool = load('src/tools/find-events.ts', { '../lib/morgen': {
    listCalendars: async () => [calendar],
    readEvents: async () => [{ id: 'e', accountId: calendar.accountId, calendarId: calendar.id, title: 'Focus' }],
  }});
  const result = await tool.default({ start: '2026-10-01T00:00:00Z', end: '2026-10-02T00:00:00Z' });
  assert.equal(result.events[0].calendarRef, ref(calendar));
  assert.equal('accountId' in result.events[0], false);
  assert.equal('calendarId' in result.events[0], false);
});


test('Search Events shows each all-day date without timezone shifts and retains timed subtitles', () => {
  const events = [
    { id: 'day-one', title: 'Demo', start: '2026-10-17T00:00:00', timeZone: 'Pacific/Kiritimati', showWithoutTime: true },
    { id: 'day-two', title: 'Demo', start: '2026-10-18T00:00:00', timeZone: 'America/Los_Angeles', showWithoutTime: true },
    { id: 'timed', title: 'Demo', start: '2026-10-17T10:00:00Z', timeZone: 'Europe/London', showWithoutTime: false },
  ];
  const states = [events, '', false, false];
  const List = Object.assign(() => {}, { Item: 'Item' });
  const command = load('src/search-events.tsx', {
    '@raycast/api': { List, Icon: {} },
    react: { useState: () => [states.shift(), () => {}], useEffect: () => {} },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    './lib/morgen': {}, './event-actions': {},
  });
  const items = command.default().props.children;
  assert.equal(items[0].props.subtitle, '2026-10-17 · All day');
  assert.equal(items[1].props.subtitle, '2026-10-18 · All day');
  const instant = new Date('2026-10-17T10:00:00Z');
  const date = instant.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const time = instant.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  assert.equal(items[2].props.subtitle, `${date} ${time}`);
});
