const { test } = require('node:test');
const assert = require('node:assert/strict');
const loadModule = require('./load.cjs');
function modules(overrides = {}, globals = {}) { return file => loadModule(file, overrides, globals); }
const calendar = { id: 'c', accountId: 'a', name: 'Personal', myRights: { mayReadItems: true, mayWriteOwn: true } };
const event = { id: 'event', accountId: 'a', calendarId: 'c', title: 'Focus', start: '2026-10-01T10:00:00', timeZone: 'Europe/London', duration: 'PT60M', participants: { me: { roles: { owner: true }, accountOwner: true } } };
const plain = x => JSON.parse(JSON.stringify(x));
function fixture(options = {}) {
  const calls = [], reads = [];
  let calendars = [structuredClone(calendar)], events = [structuredClone(event)];
  const load = modules({ '@raycast/api': { getPreferenceValues: () => ({ apiKey: 'fake' }) }, 'src/lib/transport.ts': {
    sendMorgenRequest: async (url, _key, init) => {
      if (url === '/calendars/list') { reads.push(['calendars', true]); return { data: { calendars } }; }
      if (url.startsWith('/events/list')) { const params = new URLSearchParams(url.split('?')[1]); reads.push(['events', params.get('accountId'), params.get('calendarIds').split(',')]); return { data: { events } }; }
      const body = init?.body ? JSON.parse(init.body) : undefined;
      calls.push([url, body]);
      if (url === '/events/create') return { data: { event: { ...body, id: 'new' } } };
      return options.response?.(url);
    },
  }});
  const api = load('src/lib/morgen.ts');
  return { api, calls, reads, setCalendars: x => { calendars = x; api.invalidateCache(); }, setEvents: x => { events = x; api.invalidateCache(); } };
}

test('event edit uses refreshed ownership and minimal patch; delete targets the same occurrence', async () => {
  const f = fixture();
  await f.api.updateEvent(event, { title: 'Changed', description: '' });
  assert.deepEqual(f.calls[0], ['/events/update', { id: 'event', accountId: 'a', calendarId: 'c', title: 'Changed' }]);
  assert.deepEqual(f.reads[0], ['calendars', true]);
  await f.api.updateEvent(event, { title: 'Focus', description: 'Details' });
  assert.equal(f.calls[1][1].descriptionContentType, 'text/plain');
  await f.api.updateEvent(event, { title: 'Focus', description: '' });
  assert.equal(f.calls.length, 2);
  await f.api.deleteEvent({ ...event, masterEventId: 'series' });
  assert.deepEqual(f.calls[2], ['/events/delete', { id: 'event', accountId: 'a', calendarId: 'c' }]);
});

test('event mutations fail closed for disconnected calendars, account, missing ID, stale ownership and absent event', async () => {
  for (const kind of ['outside', 'wrong-account', 'readonly', 'calendar-delete-only', 'unknown-owner', 'other-owner', 'missing', 'missing-id']) {
    const f = fixture();
    if (kind === 'outside') f.setCalendars([]);
    if (kind === 'wrong-account') f.setCalendars([{ ...calendar, accountId: 'b' }]);
    if (kind === 'readonly') f.setCalendars([{ ...calendar, myRights: {} }]);
    if (kind === 'calendar-delete-only') f.setCalendars([{ ...calendar, myRights: { mayDelete: true } }]);
    if (kind === 'unknown-owner') f.setEvents([{ ...event, participants: undefined }]);
    if (kind === 'other-owner') f.setEvents([{ ...event, participants: { other: { roles: { owner: true } } } }]);
    if (kind === 'missing') f.setEvents([]);
    const selected = kind === 'missing-id' ? { ...event, id: undefined } : event;
    await assert.rejects(f.api.deleteEvent(selected), undefined, kind);
    await assert.rejects(f.api.updateEvent(selected, { title: 'Changed', description: '' }), undefined, kind);
    assert.equal(f.calls.length, 0, kind);
  }
});

test('shared write-all and explicitly ownerless events are writable; conflicting edits are blocked', async () => {
  const f = fixture();
  f.setCalendars([{ ...calendar, myRights: { mayWriteAll: true } }]);
  f.setEvents([{ ...event, participants: undefined }]);
  await f.api.deleteEvent(event);
  f.setCalendars([calendar]); f.setEvents([{ ...event, participants: {} }]);
  await f.api.deleteEvent(event);
  f.setEvents([{ ...event, title: 'Someone else changed this' }]);
  await assert.rejects(f.api.updateEvent(event, { title: 'My change', description: '' }), /changed since/);
  assert.equal(f.calls.length, 2);
});

test('new event browser rechecks connected calendars and rejects unexpected account/calendar results', async () => {
  const f = fixture();
  f.setEvents([event, { ...event, calendarId: 'outside' }, { ...event, accountId: 'other' }]);
  const result = await f.api.listEvents([calendar, { ...calendar, id: 'outside' }], new Date('2026-10-01'), new Date('2026-10-02'));
  assert.equal(result.length, 1);
  assert.deepEqual(plain(f.reads[1][2]), ['c']);
  f.setCalendars([]);
  assert.equal((await f.api.listEvents([calendar], new Date(), new Date())).length, 0);
});

test('manual timed and all-day creation validates calendars, permissions, timezone and payload', async () => {
  const f = fixture();
  const timed = { accountId: 'a', calendarId: 'c', title: ' Focus ', start: '2026-10-01T10:00:00', timeZone: 'Europe/London', duration: 'PT60M', showWithoutTime: false, description: 'Details' };
  await f.api.createEvent(timed);
  assert.equal(f.calls[0][1].title, 'Focus');
  await f.api.createEvent({ ...timed, start: '2026-03-08T00:00:00', timeZone: null, duration: 'P1D', showWithoutTime: true });
  assert.equal(f.calls[1][1].duration, 'P1D');
  for (const patch of [{ accountId: 'other' }, { calendarId: 'outside' }, { title: '' }, { duration: 'PT0M' }, { start: '2026-02-30T10:00:00' }, { start: timed.start + 'Z' }, { timeZone: 'Wrong/Zone' }, { start: '2026-03-08T02:30:00', timeZone: 'America/New_York' }, { start: '2026-11-01T01:30:00', timeZone: 'America/New_York' }, { showWithoutTime: true }]) {
    await assert.rejects(f.api.createEvent({ ...timed, ...patch }));
  }
  f.setCalendars([{ ...calendar, myRights: {} }]);
  await assert.rejects(f.api.createEvent(timed));
  assert.equal(f.calls.length, 2);
});

test('all-day dates and browse day ranges preserve calendar days across DST', () => {
  const dates = modules({ '@raycast/api': {} })('src/lib/dates.ts');
  for (const [day, hours] of [['2026-03-08', 23], ['2026-11-01', 25]]) {
    const now = new Date(day + 'T12:00:00Z');
    const range = dates.calendarDayRange(1, now, 'America/New_York');
    assert.equal((range.end - range.start) / 3600000, hours);
    assert.deepEqual(plain(dates.formEventTime(now, '', true, 'America/New_York')), { start: day + 'T00:00:00', duration: 'P1D', timeZone: null, showWithoutTime: true });
  }
  for (const days of [7, 14, 30]) assert.ok(dates.calendarDayRange(days).end > dates.calendarDayRange(days).start);
  assert.equal(dates.eventStartDate({ ...event, start: '2026-10-01T10:00:00+02:00' }).toISOString(), '2026-10-01T08:00:00.000Z');
  assert.match(dates.formatEventTime({ ...event, showWithoutTime: true }), /2026-10-01.*All day/);
  assert.throws(() => dates.formEventTime(new Date(), '25:30', false));
});

test('native task lifecycle sends minimal bodies, skips unchanged edits, and requires creation ID', async () => {
  const f = fixture({ response: url => url === '/tasks/create' ? { data: { id: 'new-task' } } : undefined });
  const input = { title: ' Task ', description: 'Details', due: '2026-10-01T15:30:00', timeZone: 'Europe/London', estimatedDuration: 'PT30M', priority: 5 };
  assert.equal(await f.api.createTask(input), 'new-task');
  assert.equal(f.calls[0][1].title, 'Task');
  const task = { id: 't', title: 'Task', description: 'Details', priority: 5 };
  await f.api.updateTask(task, { title: 'Task', description: 'Details', priority: 5 });
  assert.equal(f.calls.length, 1);
  await f.api.updateTask(task, { title: 'Task', description: '', priority: 1 });
  await f.api.closeTask(task); await f.api.deleteTask(task);
  assert.deepEqual(f.calls.slice(1), [['/tasks/update', { id: 't', description: '', priority: 1 }], ['/tasks/close', { id: 't' }], ['/tasks/delete', { id: 't' }]]);
  assert.equal(f.reads.length, 0, 'Tasks are account-wide and do not query calendars');
  await assert.rejects(fixture().api.createTask({ title: 'Task' }), /task ID/);
});

test('task validation rejects invalid input and malformed list responses without writes', async () => {
  const f = fixture();
  for (const input of [{ title: '' }, { title: 'Task', priority: 10 }, { title: 'Task', priority: 1.5 }, { title: 'Task', due: '2026-02-30T10:00:00', timeZone: 'Europe/London' }, { title: 'Task', due: '2026-10-01T10:00:00Z', timeZone: 'Europe/London' }, { title: 'Task', estimatedDuration: 'PT0M' }]) await assert.rejects(f.api.createTask(input));
  await assert.rejects(f.api.closeTask({ title: 'Missing ID' }));
  await assert.rejects(f.api.deleteTask({ id: 't', deleted: true }));
  assert.equal(f.calls.length, 0);
  await assert.rejects(f.api.listTasks(), /status is unknown/);
  const result = await fixture({ response: () => ({ data: { tasks: [{ id: 'open' }, { id: 'done', progress: 'completed' }, { id: 'gone', deleted: true }] } }) }).api.listTasks();
  assert.deepEqual(plain(result), [{ id: 'open' }]);
});

test('real transport invalidates task lists after each mutation and never retries errors', async () => {
  let reads = 0, writes = 0, fail = false;
  const load = modules({ '@raycast/api': { getPreferenceValues: () => ({ apiKey: 'fake-test-key' }) } }, {
    fetch: async (url, init) => {
      if (init.method === 'POST') writes++; else reads++;
      const status = fail ? 429 : 200;
      return { ok: !fail, status, headers: new Headers({ 'Retry-After': '10' }), text: async () => JSON.stringify({ data: url.includes('/list') ? { tasks: [] } : { id: 'new' } }) };
    },
  });
  const api = load('src/lib/morgen.ts');
  await api.listTasks(); await api.listTasks(); assert.equal(reads, 1);
  await api.createTask({ title: 'Task' }); await api.listTasks(); assert.equal(reads, 2);
  for (const operation of [() => api.updateTask({ id: 't', title: 'Old' }, { title: 'New' }), () => api.closeTask({ id: 't' }), () => api.deleteTask({ id: 't' })]) { await operation(); await api.listTasks(); }
  assert.equal(reads, 5); assert.equal(writes, 4);
  fail = true; await assert.rejects(api.createTask({ title: 'Task' }), /rate limit/); assert.equal(writes, 5);
});

test('request sequence invalidates old results on refresh and unmount', () => {
  const { RequestSequence } = modules()('src/lib/request-sequence.ts');
  const sequence = new RequestSequence();
  const first = sequence.begin(), second = sequence.begin();
  assert.equal(first(), false); assert.equal(second(), true); sequence.invalidate(); assert.equal(second(), false);
});

function uiHarness(file, services = {}, confirmation = true, wire, raycastOverrides = {}) {
  let states = [], refs = [], si = 0, ri = 0, effect, confirmations = 0, failures = 0, pops = 0;
  const node = (type, props) => ({ type, props });
  const raycast = {
    Action: { Push: 'Push', SubmitForm: 'SubmitForm', Style: { Destructive: 'destructive' } }, ActionPanel: 'ActionPanel',
    Alert: { ActionStyle: { Destructive: 'destructive' } }, confirmAlert: async () => { confirmations++; return confirmation; },
    Detail: Object.assign(() => {}, { Metadata: Object.assign(() => {}, { Label: 'Label' }) }),
    Form: { DatePicker: Object.assign(() => {}, { Type: { Date: 'date' } }), Checkbox: 'Checkbox', TextField: 'TextField', TextArea: 'TextArea', Description: 'Description', Dropdown: Object.assign(() => {}, { Item: 'DropdownItem' }) },
    Icon: {}, List: Object.assign(() => {}, { Item: 'Item', EmptyView: 'EmptyView', Dropdown: Object.assign(() => {}, { Item: 'RangeItem' }) }),
    useNavigation: () => ({ pop() { pops++; } }),
    getPreferenceValues: () => ({ apiKey: 'fake-only' }),
    Toast: { Style: { Failure: 'failure', Success: 'success', Animated: 'animated' } },
    showToast: async value => { if (value.style === 'failure') failures++; }, showHUD: async () => {},
    ...raycastOverrides,
  };
  const load = modules({
    '@raycast/api': raycast,
    react: {
      useState: initial => { const i = si++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = value; }]; },
      useRef: initial => { const i = ri++; if (!(i in refs)) refs[i] = { current: initial }; return refs[i]; },
      useCallback: fn => fn, useMemo: fn => fn(), useEffect: fn => { effect = fn; },
    },
    'react/jsx-runtime': { jsx: node, jsxs: node },
    'src/lib/morgen.ts': wire ? wire.api : { listCalendars: async () => [calendar], listEvents: async () => [event], listTasks: async () => [{ id: 't', title: 'Task' }], invalidateCache() {}, ...services },
    'src/lib/ui.ts': { showFailure: async () => { await raycast.showToast({ style: 'failure' }); }, showSuccess: async () => {} },
  });
  const command = load(file).default;
  return {
    render() { si = 0; ri = 0; return command(); }, effect: () => effect(),
    counts: () => ({ confirmations, failures, pops }), states: () => states,
  };
}
function findNode(tree, predicate) {
  if (!tree || typeof tree !== 'object') return undefined;
  if (predicate(tree)) return tree;
  for (const value of Object.values(tree)) {
    if (typeof value !== 'object' || value === null) continue;
    const found = Array.isArray(value) ? value.map(v => findNode(v, predicate)).find(Boolean) : findNode(value, predicate);
    if (found) return found;
  }
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('event and task deletion require destructive confirmation; cancellation never writes', async () => {
  for (const [file, action, method] of [['src/events.tsx', 'Delete Event', 'deleteEvent'], ['src/tasks.tsx', 'Delete Task', 'deleteTask']]) {
    for (const confirmed of [false, true]) {
      let writes = 0;
      const ui = uiHarness(file, { [method]: async () => { writes++; } }, confirmed);
      ui.render(); const cleanup = ui.effect(); await flush();
      const tree = ui.render();
      const remove = findNode(tree, n => n.props?.title === action);
      assert.ok(remove, action);
      remove.props.onAction(); await flush();
      assert.equal(writes, confirmed ? 1 : 0); assert.equal(ui.counts().confirmations, 1);
      cleanup();
    }
  }
});

test('new list commands distinguish errors from empty results and suppress stale errors', async () => {
  for (const [file, method, title] of [['src/events.tsx', 'listEvents', 'Unable to Load Events'], ['src/tasks.tsx', 'listTasks', 'Unable to Load Tasks']]) {
    const ui = uiHarness(file, { [method]: async () => { throw Error('offline'); } });
    ui.render(); ui.effect(); await flush();
    assert.ok(findNode(ui.render(), n => n.props?.title === title));
    assert.equal(ui.counts().failures, 1);
    let reject;
    const stale = uiHarness(file, { [method]: () => new Promise((_, r) => { reject = r; }) });
    stale.render(); const cleanup = stale.effect(); await flush(); cleanup();
    reject(Error('late error')); await flush();
    assert.equal(stale.counts().failures, 0);
  }
});

test('event range choices remain visible', async () => {
  const events = uiHarness('src/events.tsx');
  const tree = events.render();
  for (const value of ['7', '14', '30']) assert.ok(findNode(tree, n => n.props?.value === value));
});

test('read-only event actions cannot offer editing or deletion', async () => {
  const ui = uiHarness('src/events.tsx', { listCalendars: async () => [{ ...calendar, myRights: { mayReadItems: true } }] });
  ui.render(); ui.effect(); await flush();
  const tree = ui.render();
  assert.equal(findNode(tree, n => n.props?.title === 'Delete Event'), undefined);
  assert.equal(findNode(tree, n => n.props?.title === 'Edit Event'), undefined);
  assert.ok(findNode(tree, n => n.props?.title === 'View Event'));
});

test('event mutation rejects ambiguous IDs or a changed recurrence occurrence', async () => {
  const f = fixture();
  f.setEvents([event, { ...event, start: '2026-10-02T10:00:00' }]);
  await assert.rejects(f.api.deleteEvent(event));
  f.setEvents([{ ...event, recurrenceId: 'other-occurrence' }]);
  await assert.rejects(f.api.deleteEvent(event));
  assert.equal(f.calls.length, 0);
});

test('newest refresh owns results when earlier event/task reads finish late', async () => {
  for (const [file, method, item] of [['src/events.tsx', 'listEvents', event], ['src/tasks.tsx', 'listTasks', { id: 't', title: 'Task' }]]) {
    const pending = [];
    const ui = uiHarness(file, { [method]: () => new Promise(resolve => { pending.push(resolve); }) });
    ui.render(); ui.effect(); await flush();
    const refresh = findNode(ui.render(), n => n.props?.title === 'Refresh');
    refresh.props.onAction(); await flush();
    pending[1]([{ ...item, title: 'Newest' }]); await flush();
    pending[0]([{ ...item, title: 'Stale' }]); await flush();
    const tree = ui.render();
    assert.ok(findNode(tree, n => n.props?.title === 'Newest'));
    assert.equal(findNode(tree, n => n.props?.title === 'Stale'), undefined);
  }
});

test('title-only event edits preserve an existing HTML description exactly', async () => {
  const htmlEvent = { ...event, description: '  <p>Existing content</p>\n', descriptionContentType: 'text/html' };
  const f = fixture(); f.setEvents([htmlEvent]);
  await f.api.updateEvent(htmlEvent, { title: 'New title', description: htmlEvent.description });
  assert.deepEqual(f.calls[0][1], { id: 'event', accountId: 'a', calendarId: 'c', title: 'New title' });
});

// Strict wire boundary: a swallowed unexpected request still fails verify().
// No real fetch or Raycast implementation is imported into the VM.
function wireFixture(steps, preferences = {}) {
  const unexpected = [], calls = [];
  const load = modules({ '@raycast/api': { getPreferenceValues: () => ({ apiKey: 'fake-only', ...preferences }) } }, {
    fetch: async (url, init) => {
      const request = { url: new URL(url), method: init.method || 'GET', body: init.body && JSON.parse(init.body) };
      calls.push(request);
      const step = steps.shift();
      try {
        assert.ok(step, `Unexpected network: ${request.method} ${url}`);
        assert.equal(request.url.origin, 'https://api.morgen.so');
        assert.equal(request.url.pathname, '/v3' + step.path);
        assert.equal(request.method, step.method || 'GET');
        assert.equal(init.headers.get('Authorization'), 'ApiKey fake-only');
        if (step.body) assert.deepEqual(request.body, step.body);
        step.check?.(request);
      } catch (error) { unexpected.push(error); throw error; }
      if (step.wait) await step.wait;
      if (step.error) throw step.error;
      return { ok: (step.status || 200) < 400, status: step.status || 200, headers: new Headers({ 'Retry-After': '17' }), text: async () => step.value === undefined ? '' : JSON.stringify(step.value) };
    },
  });
  return { load, api: load('src/lib/morgen.ts'), calls, verify() { assert.deepEqual(unexpected, []); assert.equal(steps.length, 0, 'Unconsumed network expectations'); } };
}
const calendarsStep = () => ({ path: '/calendars/list', value: { data: { calendars: [calendar] } } });
const eventsStep = (events = [event]) => ({ path: '/events/list', value: { data: { events } }, check: r => {
  assert.equal(r.url.searchParams.get('accountId'), 'a'); assert.equal(r.url.searchParams.get('calendarIds'), 'c');
} });

test('wire event CRUD uses connected-calendar reads, exact bodies and invalidates after edits/deletes', async () => {
  const input = { accountId: 'a', calendarId: 'c', title: 'Focus', start: event.start, timeZone: event.timeZone, duration: 'PT60M', showWithoutTime: false };
  const f = wireFixture([
    calendarsStep(), { path: '/events/create', method: 'POST', body: input, value: { data: { event } } },
    calendarsStep(), eventsStep(), { path: '/events/update', method: 'POST', body: { id: 'event', accountId: 'a', calendarId: 'c', title: 'Edited' }, status: 204 },
    calendarsStep(), eventsStep(), { path: '/events/delete', method: 'POST', body: { id: 'event', accountId: 'a', calendarId: 'c' }, status: 204 },
    calendarsStep(), eventsStep([]),
  ]);
  await f.api.createEvent(input);
  await f.api.updateEvent(event, { title: 'Edited', description: '' });
  await f.api.deleteEvent(event);
  assert.equal((await f.api.listEvents([calendar], new Date('2026-10-01'), new Date('2026-10-02'))).length, 0);
  f.verify();
});

test('wire tasks request one bounded page and filter terminal tasks without following cursors', async () => {
  const tasks = Array.from({ length: 100 }, (_, i) => ({ id: String(i), title: 'Task' }));
  tasks[0].progress = 'completed'; tasks[1].progress = 'cancelled'; tasks[2].deleted = true;
  const f = wireFixture([{ path: '/tasks/list', check: r => assert.equal(r.url.search, '?limit=100'), value: { data: { tasks, nextCursor: 'not-followed' } } }]);
  assert.equal((await f.api.listTasks()).length, 97);
  await f.api.listTasks(); f.verify();
});

for (const status of [401, 403, 429, 500, 503]) {
  test(`wire mutation failures ${status} never retry any event/task operation`, async () => {
    const operations = [
      ['events/create', a => a.createEvent({ accountId: 'a', calendarId: 'c', title: 'Focus', start: event.start, timeZone: event.timeZone, duration: 'PT60M', showWithoutTime: false }), [calendarsStep()]],
      ['events/update', a => a.updateEvent(event, { title: 'Changed', description: '' }), [calendarsStep(), eventsStep()]],
      ['events/delete', a => a.deleteEvent(event), [calendarsStep(), eventsStep()]],
      ['tasks/create', a => a.createTask({ title: 'Task' }), []],
      ['tasks/update', a => a.updateTask({ id: 't', title: 'Old' }, { title: 'New' }), []],
      ['tasks/close', a => a.closeTask({ id: 't' }), []],
      ['tasks/delete', a => a.deleteTask({ id: 't' }), []],
    ];
    for (const [path, operation, reads] of operations) {
      const f = wireFixture([...reads, { path: '/' + path, method: 'POST', status }]);
      await assert.rejects(operation(f.api), e => e.status === status);
      assert.equal(f.calls.filter(c => c.method === 'POST').length, 1); f.verify();
    }
  });
}

for (const kind of ['event', 'task']) {
  test(`command ${kind} create validates, ignores duplicate submit and executes real service/transport`, async () => {
    let finish;
    const wait = new Promise(resolve => { finish = resolve; });
    const isEvent = kind === 'event';
    const f = wireFixture([
      ...(isEvent ? [calendarsStep(), calendarsStep()] : []),
      { path: isEvent ? '/events/create' : '/tasks/create', method: 'POST', wait,
        check: r => { assert.equal(r.body.title, 'Created'); if (isEvent) { assert.equal(r.body.duration, 'P1D'); assert.equal(r.body.timeZone, null); assert.match(r.body.start, /T00:00:00$/); } },
        value: { data: isEvent ? { event: { ...event, id: 'new' } } : { id: 'new' } } },
    ]);
    const ui = uiHarness(`src/create-${kind}.tsx`, {}, true, f);
    ui.render();
    if (isEvent) { ui.effect(); await flush(); }
    const submit = findNode(ui.render(), n => n.props?.onSubmit).props.onSubmit;
    const values = { title: ' Created ', description: '', start: new Date('2026-03-08T12:00:00Z'), startTime: '', allDay: true, calendar: JSON.stringify(['a','c']), duration: isEvent ? 'P1D' : 'none', priority: '0' };
    await submit({ ...values, title: ' ' });
    assert.equal(ui.counts().failures, 1);
    assert.equal(f.calls.filter(c => c.method === 'POST').length, 0);
    const pending = submit(values); await flush(); await submit(values);
    assert.equal(f.calls.filter(c => c.method === 'POST').length, 1);
    finish(); await pending; assert.equal(ui.counts().pops, 1); f.verify();
  });

  test(`command ${kind} delete cancellation stops before service/network; confirm refreshes list`, async () => {
    for (const confirmed of [false, true]) {
      const isEvent = kind === 'event';
      const read = () => isEvent ? [calendarsStep(), eventsStep()] : [{ path: '/tasks/list', value: { data: { tasks: [{ id: 't', title: 'Task' }] } } }];
      const f = wireFixture([...read(), ...(confirmed ? [
        ...(isEvent ? [calendarsStep(), eventsStep()] : []),
        { path: isEvent ? '/events/delete' : '/tasks/delete', method: 'POST', status: 204 }, ...read(),
      ] : [])]);
      const ui = uiHarness(isEvent ? 'src/events.tsx' : 'src/tasks.tsx', {}, confirmed, f);
      ui.render(); const cleanup = ui.effect(); await flush();
      findNode(ui.render(), n => n.props?.title === (isEvent ? 'Delete Event' : 'Delete Task')).props.onAction();
      await flush(); assert.equal(ui.counts().confirmations, 1);
      assert.equal(f.calls.filter(c => c.method === 'POST').length, confirmed ? 1 : 0);
      cleanup(); f.verify();
    }
  });
}

test('wire ownership revalidation blocks a stale writable selection', async () => {
  for (const current of [{ ...calendar, id: 'disconnected' }, { ...calendar, myRights: {} }]) {
    const f = wireFixture([{ path: '/calendars/list', value: { data: { calendars: [current] } } },
      ...(current.id === calendar.id ? [eventsStep([{ ...event, participants: {} }])] : [])]);
    await assert.rejects(f.api.deleteEvent(event)); f.verify();
    assert.equal(f.calls.some(c => c.method === 'POST'), false);
  }
});

test('wire empty task reads are errors but empty lists and 204 mutations are valid', async () => {
  const f = wireFixture([
    { path: '/tasks/list', status: 204 }, { path: '/tasks/list', value: { data: { tasks: [] } } },
    { path: '/tasks/close', method: 'POST', body: { id: 't' }, status: 204 },
    { path: '/tasks/list', value: { data: { tasks: [] } } },
    { path: '/tasks/create', method: 'POST', status: 204 },
  ]);
  await assert.rejects(f.api.listTasks(), /status is unknown/);
  assert.equal((await f.api.listTasks()).length, 0);
  await f.api.closeTask({ id: 't' }); await f.api.listTasks();
  await assert.rejects(f.api.createTask({ title: 'Task' }), /task ID/); f.verify();
});

for (const kind of ['event', 'task']) {
  test(`command ${kind} edit executes actual minimal mutation and refresh`, async () => {
    const isEvent = kind === 'event';
    const read = () => isEvent ? [calendarsStep(), eventsStep()] : [{ path: '/tasks/list', value: { data: { tasks: [{ id: 't', title: 'Task' }] } } }];
    const f = wireFixture([...read(), ...(isEvent ? [calendarsStep(), eventsStep()] : []),
      { path: isEvent ? '/events/update' : '/tasks/update', method: 'POST', body: isEvent ? { id: 'event', accountId: 'a', calendarId: 'c', title: 'Edited' } : { id: 't', title: 'Edited' }, status: 204 }, ...read()]);
    const ui = uiHarness(isEvent ? 'src/events.tsx' : 'src/tasks.tsx', {}, true, f);
    ui.render(); const cleanup = ui.effect(); await flush();
    const target = findNode(ui.render(), n => n.props?.title === (isEvent ? 'Edit Event' : 'Edit Task')).props.target;
    const form = target.type(target.props);
    await findNode(form, n => n.props?.onSubmit).props.onSubmit({ title: 'Edited', description: '', priority: '0' });
    await flush(); cleanup(); f.verify();
  });
}

test('task due times reject DST gaps and overlaps before any network request', async () => {
  const f = wireFixture([]);
  for (const due of ['2026-03-08T02:30:00', '2026-11-01T01:30:00']) {
    await assert.rejects(f.api.createTask({ title: 'Task', due, timeZone: 'America/New_York' }));
  }
  f.verify();
});

for (const file of ['src/search-events.tsx', 'src/list-today-events.tsx', 'src/create-event.tsx']) {
  test(`load effects retain visible failure when showToast rejects: ${file}`, async () => {
    const f = wireFixture([{ path: '/calendars/list', status: 503 }]);
    let notifications = 0;
    const ui = uiHarness(file, {}, true, f, { showToast: async () => {
      notifications++;
      throw new Error('Toast service unavailable');
    } });
    ui.render(); const cleanup = ui.effect(); await flush();
    const tree = ui.render();
    assert.equal(tree.props.isLoading, false);
    assert.ok(findNode(tree, n => n.props?.title === (file.includes('create') ? 'Unable to Load Calendars' : 'Unable to Load Events')));
    assert.equal(notifications, 1, 'Do not retry the failed notification');
    f.verify(); cleanup();
  });

  test(`load effects ignore toast rejection after unmount: ${file}`, async () => {
    const f = wireFixture([{ path: '/calendars/list', status: 503 }]);
    let rejectToast;
    const ui = uiHarness(file, {}, true, f, { showToast: () => new Promise((_, reject) => { rejectToast = reject; }) });
    ui.render(); const cleanup = ui.effect(); await flush();
    assert.ok(rejectToast, 'The failing read reached the notification boundary');
    cleanup();
    const before = plain(ui.states());
    rejectToast(new Error('Toast service unavailable'));
    await flush();
    assert.deepEqual(plain(ui.states()), before, 'No state changes after unmount');
    f.verify();
  });
}

test('event browser preserves successful accounts and explicitly reports partial failure', async () => {
  const calendars = [calendar, { ...calendar, accountId: 'other' }];
  const load = modules({ '@raycast/api': { getPreferenceValues: () => ({ apiKey: 'fake' }) }, 'src/lib/transport.ts': {
    sendMorgenRequest: async url => {
      if (url === '/calendars/list') return { data: { calendars } };
      if (url.includes('accountId=other')) throw new Error('Unavailable');
      return { data: { events: [event] } };
    },
  }});
  const api = load('src/lib/morgen.ts');
  let failed;
  const events = await api.listEvents(calendars, new Date('2026-10-01'), new Date('2026-10-02'), failures => { failed = failures; });
  assert.equal(events.length, 1); assert.equal(failed[0].accountId, 'other');
  await assert.rejects(api.listEvents(calendars, new Date('2026-10-01'), new Date('2026-10-02')), /Availability is unknown/);
  const ui = uiHarness('src/events.tsx', { listEvents: async (_calendars, _start, _end, onFailures) => {
    onFailures([{ accountId: 'other', error: new Error('Unavailable') }]); return [event];
  } });
  ui.render(); ui.effect(); await flush();
  const tree = ui.render();
  assert.ok(findNode(tree, n => n.props?.title === 'Some Calendars Could Not Be Loaded'));
  assert.ok(findNode(tree, n => n.props?.title === 'Focus'));
});
