const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');
const response = (value, status = 200) => ({ ok: status < 400, status, headers: new Headers({ 'Retry-After': '30' }), text: async () => value === undefined ? '' : JSON.stringify(value) });
function api(fetch, preferences = () => ({ apiKey: 'test' }), globals = {}) {
  return load('src/lib/morgen.ts', { '@raycast/api': { getPreferenceValues: preferences } }, { fetch, ...globals });
}
test('permission helper requires both identifiers and ownership evidence', () => {
  const { canModifyEvent: can } = load('src/lib/event-permissions.ts');
  const c = { id: 'c', accountId: 'a', myRights: { mayWriteOwn: true } };
  const e = { id: 'e', calendarId: 'c', accountId: 'a' };
  assert.equal(can(undefined, e), false);
  assert.equal(can(c, e), false);
  assert.equal(can(c, { ...e, participants: {} }), true);
  assert.equal(can(c, { ...e, participants: { p: { roles: { owner: true } } } }), false);
  assert.equal(can(c, { ...e, participants: { p: { roles: { owner: true }, accountOwner: true } } }), true);
  assert.equal(can(c, { ...e, participants: { p: { roles: { attendee: true }, accountOwner: true }, q: { roles: { owner: true } } } }), false);
  for (const patch of [{ accountId: 'b' }, { calendarId: 'd' }]) assert.equal(can({ ...c, myRights: { mayWriteAll: true } }, { ...e, ...patch }), false);
  assert.equal(can({ ...c, myRights: { mayDelete: true, mayAdmin: true } }, e), false);
  assert.equal(can({ ...c, myRights: { mayWriteAll: true } }, e), true);
});
test('transport handles errors, empty responses, and never retries', async () => {
  for (const status of [401, 403, 429, 500]) {
    let calls = 0;
    const a = api(async () => { calls++; return response({}, status); });
    await assert.rejects(a.morgenFetch('/test'), e => e.status === status && (status !== 429 || e.message.includes('30')));
    assert.equal(calls, 1);
  }
  for (const status of [200, 204]) {
    const a = api(async () => response(undefined, status));
    assert.equal(await a.morgenFetch('/test'), undefined);
    await assert.rejects(a.readEvents('a', ['c'], 'start', 'end'), /Availability is unknown/);
    await assert.rejects(a.listCalendars(), /Availability is unknown/);
  }
});
test('timeout covers response body and caller cancellation is preserved', async () => {
  let timeout;
  let cleared = false;
  const a = api(async (_url, { signal }) => ({ ok: true, status: 200, text: () => new Promise((resolve, reject) => { if (signal.aborted) reject(new Error('aborted')); else signal.addEventListener('abort', () => reject(new Error('aborted'))); }) }), undefined,
    { setTimeout: (fn, ms) => { assert.equal(ms, 15000); timeout = fn; return 1; }, clearTimeout: () => { cleared = true; } });
  const pending = a.morgenFetch('/test');
  await Promise.resolve();
  timeout();
  await assert.rejects(pending, /timed out/);
  assert.equal(cleared, true);
  const controller = new AbortController(); controller.abort();
  const b = api(async (_url, { signal }) => { assert.equal(signal.aborted, true); throw new Error('aborted'); });
  await assert.rejects(b.morgenFetch('/test', { signal: controller.signal }), /cancelled/);
});
test('cache TTL, credential isolation and clone isolation', async () => {
  let now = 0, calls = 0, key = 'one';
  class Clock extends Date { static now() { return now; } }
  const a = api(async url => { calls++; return response({ data: url.includes('calendars') ? { calendars: [{ id: 'c', name: 'Personal' }, { id: 'w', name: 'Work' }] } : { events: [] } }); },
    () => ({ apiKey: key }), { Date: Clock });
  const calendars = await a.listCalendars(); assert.equal(calendars.length, 2); calendars[0].name = 'Corrupted';
  assert.equal((await a.listCalendars())[0].name, 'Personal');
  await a.readEvents('a', ['c'], 'start', 'end'); await a.readEvents('a', ['c'], 'start', 'end'); assert.equal(calls, 2);
  now = 60000; await a.readEvents('a', ['c'], 'start', 'end'); assert.equal(calls, 3);
  await a.listCalendars(); assert.equal(calls, 3);
  now = 300000; await a.listCalendars(); assert.equal(calls, 4);
  key = 'two'; await a.listCalendars(); assert.equal(calls, 5);
});
test('write invalidates cache and older in-flight reads cannot restore it', async () => {
  let finish, reads = 0;
  const a = api(async (_url, options) => {
    if (options.method === 'POST') return response({ data: { event: { id: 'created' } } });
    reads++;
    if (reads === 1) return new Promise(resolve => { finish = () => resolve(response({ data: { events: [] } })); });
    return response({ data: { events: [] } });
  });
  const old = a.readEvents('a', ['c'], 'start', 'end');
  await a.morgenFetch('/events/create', { method: 'POST', body: '{}' }); finish(); await old;
  await a.readEvents('a', ['c'], 'start', 'end'); assert.equal(reads, 2);
});
test('unmounted list commands ignore late request results', async () => {
  for (const file of ['src/list-today-events.tsx', 'src/search-events.tsx']) {
    let effect, resolve, updates = 0;
    const command = load(file, {
      '@raycast/api': { List: {}, Icon: {} },
      react: { useEffect: fn => { effect = fn; }, useState: initial => [initial, () => { updates++; }] },
      'react/jsx-runtime': { jsx: () => ({}), jsxs: () => ({}) }, './event-actions': {},
      './utils': { fetchEventsWithErrorHandling: () => new Promise(r => { resolve = r; }) },
    });
    command.default(); const cleanup = effect(); cleanup(); resolve({ events: [], error: true });
    await Promise.resolve(); await Promise.resolve(); assert.equal(updates, 0);
  }
});
test('failed writes invalidate cached reads without retries; failed reads are not cached', async () => {
  let reads = 0, writes = 0, failRead = false;
  const a = api(async (_url, options) => {
    if (options.method === 'POST') { writes++; throw new Error('connection lost'); }
    reads++;
    return response({ data: { events: [] } }, failRead ? 500 : 200);
  });
  const read = () => a.readEvents('a', ['c'], 'start', 'end');
  await read(); await assert.rejects(a.morgenFetch('/events/create', { method: 'POST', body: '{}' }), /Check Morgen/);
  await read(); assert.equal(reads, 2); assert.equal(writes, 1);
  a.invalidateCache(); failRead = true;
  await assert.rejects(read()); await assert.rejects(read()); assert.equal(reads, 4);
});
test('calendar labels use account and calendar identity together', async () => {
  const utils = load('src/utils.ts', {
    '@raycast/api': {}, '@js-temporal/polyfill': require('@js-temporal/polyfill'),
    './lib/morgen': { listCalendars: async () => [{ id: 'c', accountId: 'a', name: 'First' }, { id: 'c', accountId: 'b', name: 'Second' }],
      readEvents: async accountId => [{ accountId, calendarId: 'c', start: '2026-10-09T10:00:00Z' }] },
  });
  const events = await utils.fetchEventsForRange('start', 'end');
  assert.equal(events[0].calendarName, 'First'); assert.equal(events[1].calendarName, 'Second');
});
test('fresh calendar checks bypass cached permissions before creation', async () => {
  let calls = 0;
  const a = api(async () => { calls++; return response({ data: { calendars: [{ id: 'c', myRights: { mayWriteOwn: calls === 1 } }] } }); });
  assert.equal((await a.listCalendars())[0].myRights.mayWriteOwn, true);
  assert.equal((await a.listCalendars())[0].myRights.mayWriteOwn, true);
  assert.equal((await a.listCalendars(true))[0].myRights.mayWriteOwn, false);
  assert.equal(calls, 2);
});

test('missing credentials fail before network, including after a cached authenticated read', async () => {
  let key = 'fake', calls = 0;
  const a = api(async () => { calls++; return response({ data: { calendars: [] } }); }, () => ({ apiKey: key }));
  await a.listCalendars();
  for (key of ['', '   ', undefined]) {
    await assert.rejects(a.listCalendars(), /Add a Morgen API key/);
    await assert.rejects(a.morgenFetch('/events/create', { method: 'POST', body: '{}' }), /Add a Morgen API key/);
  }
  assert.equal(calls, 1);
});

test('a timed-out mutation is attempted once and invalidates previously cached reads', async () => {
  let expire, reads = 0, writes = 0;
  const a = api(async (_url, init) => {
    if (init.method !== 'POST') { reads++; return response({ data: { events: [] } }); }
    writes++;
    return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(Error('aborted'))));
  }, undefined, { setTimeout: fn => { expire = fn; return 1; }, clearTimeout: () => {} });
  const read = () => a.readEvents('a', ['c'], 'start', 'end');
  await read();
  const write = a.morgenFetch('/events/create', { method: 'POST', body: '{}' }); expire();
  await assert.rejects(write, /timed out.*Check Morgen/);
  await read(); assert.equal(reads, 2); assert.equal(writes, 1);
});



test('raw event reads filter unexpected accounts and calendars before every consumer', async () => {
  const client = api(async () => response({ data: { events: [
    { id: 'good', accountId: 'work', calendarId: 'primary' },
    { id: 'missing-account', calendarId: 'primary' },
    { id: 'wrong-account', accountId: 'personal', calendarId: 'primary' },
    { id: 'wrong-calendar', accountId: 'work', calendarId: 'outside' },
  ] } }));
  const result = await client.readEvents('work', ['primary'], '2026-10-01T00:00:00Z', '2026-10-02T00:00:00Z');
  assert.equal(result.length, 2);
  assert.equal(result[1].accountId, 'work');
});

test('connected calendars from all accounts keep original names and ignore retired scope preferences', async () => {
  const calendars = [
    { id: 'primary', accountId: 'work', name: 'Work' },
    { id: 'primary', accountId: 'personal', name: 'Personal' },
  ];
  const client = api(async () => response({ data: { calendars } }),
    () => ({ apiKey: 'test', accountId: 'work', calendarName: 'Missing', calendarAlias: 'Alias' }));
  assert.deepEqual(JSON.parse(JSON.stringify(await client.listCalendars())), calendars);
});
