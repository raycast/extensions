const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the real TypeScript entry points with isolated Raycast/network dependencies.
function load(file, mocks, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (id) => {
    if (!(id in mocks)) throw new Error(`Unexpected dependency ${id}`);
    return mocks[id];
  }, Date, Intl, URLSearchParams, ...globals });
  return exports;
}
const calendar = { id: 'cal', accountId: 'account', name: 'Work', myRights: { mayWriteOwn: true } };
const input = { accountId: 'account', calendarId: 'cal', title: ' Focus ', start: '2026-10-01T10:00:00', timeZone: 'America/Argentina/Cordoba', durationMinutes: 45 };

test('creation preview does not write; execution sends only the approved fields', async () => {
  const calls = [];
  const tool = load('src/tools/create-event.ts', { '@raycast/api': {}, '../api': {
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
  const tool = load('src/tools/create-event.ts', { '@raycast/api': {}, '../api': {
    listCalendars: async () => [calendar, { ...calendar, id: 'readonly', myRights: {} }],
    createEvent: async () => { writes++; },
  }});
  for (const patch of [{ title: ' ' }, { start: '2026-02-30T10:00:00' }, { start: input.start + 'Z' }, { timeZone: 'Imaginary/Zone' }, { durationMinutes: 0 }, { durationMinutes: 1.5 }, { accountId: 'wrong' }, { calendarId: 'readonly' }]) {
    await assert.rejects(tool.default({ ...input, ...patch }));
  }
  assert.equal(writes, 0);
});

test('search groups accounts, preserves timezone, and filters title', async () => {
  const calls = [];
  const tool = load('src/tools/find-events.ts', { '../api': {
    listCalendars: async () => [calendar, { ...calendar, accountId: 'other', name: 'Personal' }],
    listEvents: async (accountId, ids) => { calls.push([accountId, ...ids]); return [{ calendarId: 'cal', title: 'Focus', start: input.start, timeZone: input.timeZone }, { calendarId: 'cal', title: 'Lunch' }]; },
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
  const tool = load('src/tools/find-events.ts', { '../api': {
    listCalendars: async () => [calendar], listEvents: async () => { throw new Error('Unavailable'); },
  }});
  await assert.rejects(tool.default({ start: '2026-10-01T00:00:00Z', end: '2026-10-02T00:00:00Z' }), /Unavailable/);
});

test('API unwraps created event and rejects success responses missing its ID', async () => {
  let response = { data: { event: { id: 'created', title: 'Focus' } } };
  const api = load('src/api.ts', { '@raycast/api': { getPreferenceValues: () => ({ morgenApiKey: 'test' }), showToast: async () => {}, Toast: { Style: { Failure: 'failure' } } } }, {
    fetch: async () => ({ ok: true, json: async () => response }),
  });
  assert.equal((await api.createEvent({})).id, 'created');
  response = { data: {} };
  await assert.rejects(api.createEvent({}), /Check Morgen before retrying/);
});

test('calendar scope excludes other calendars and fails closed for unknown names', async () => {
  let scope = 'Personal';
  const api = load('src/api.ts', { '@raycast/api': { getPreferenceValues: () => ({ morgenApiKey: 'test', calendarName: scope, calendarAlias: 'Demo' }), showToast: async () => {}, Toast: { Style: { Failure: 'failure' } } } }, {
    fetch: async () => ({ ok: true, json: async () => ({ data: { calendars: [{ id: 'personal', name: 'Personal' }, { id: 'work', name: 'Work' }] } }) }),
  });
  const selected = await api.listCalendars();
  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, 'personal');
  assert.equal(selected[0].name, 'Demo');
  scope = 'Missing';
  await assert.rejects(api.listCalendars(), /No calendar matches/);
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
  const utils = load('src/utils.ts', { '@raycast/api': {}, './api': {}, '@js-temporal/polyfill': require('@js-temporal/polyfill') });
  assert.equal(utils.formatTime('2026-10-01T10:00:00', 'Europe/London'), utils.formatTime('2026-10-01T09:00:00Z'));
});

test('event dates resolve foreign zones, DST transitions, and explicit offsets', () => {
  const utils = load('src/utils.ts', { '@raycast/api': {}, './api': {}, '@js-temporal/polyfill': require('@js-temporal/polyfill') });
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
    './api': {
      listCalendars: async () => [calendar],
      listEvents: async () => [
        { id: 'later', calendarId: 'cal', start: '2026-10-01T09:00:00', timeZone: 'America/New_York' },
        { id: 'earlier', calendarId: 'cal', start: '2026-10-01T10:00:00', timeZone: 'Asia/Tokyo' },
      ],
    },
  });
  const result = await utils.fetchEventsForRange('2026-10-01T00:00:00Z', '2026-10-02T00:00:00Z');
  assert.equal(result[0].id, 'earlier');
});
