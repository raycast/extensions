const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
process.env.TZ = 'America/New_York';
const filename = path.resolve(__dirname, '../src/calendar-model.ts');
const model = new Module(filename, module);
model.filename = filename;
model.paths = module.paths;
model._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } })
    .outputText,
  filename,
);
const { getCalendarWindow, selectEvents, eventTimeLabel } = model.exports;
const event = (overrides = {}) => ({
  id: 'e',
  title: 'Meeting',
  calendar: 'Work',
  start: '2026-10-19T14:00:00-04:00',
  end: '2026-10-19T15:00:00-04:00',
  allDay: false,
  ...overrides,
});
test('Today uses local midnights including the DST transition', () => {
  const { start, end } = getCalendarWindow('today', 30, new Date(2026, 2, 8, 12));
  assert.equal(start.getHours(), 0);
  assert.equal(end.getDate(), 9);
  assert.equal(end - start, 23 * 3600000);
});
test('Upcoming starts tomorrow and bounds invalid day settings', () => {
  const now = new Date(2026, 9, 19, 12);
  const { start, end } = getCalendarWindow('upcoming', '7', now);
  assert.equal(start.getDate(), 20);
  assert.equal(end.getDate(), 27);
  assert.equal(getCalendarWindow('upcoming', 'bad', now).end.toDateString(), new Date(2026, 10, 19).toDateString());
  assert.equal(getCalendarWindow('inbox', 30, now), null);
});
test('filters exact calendar names and half-open overlap, sorts and keeps recurring occurrences distinct', () => {
  const range = getCalendarWindow('today', 30, new Date(2026, 9, 19, 12));
  const rows = selectEvents(
    [
      event(),
      event(),
      event({ id: 'e', start: '2026-10-19T16:00:00-04:00', end: '2026-10-19T17:00:00-04:00' }),
      event({ id: 'overnight', start: '2026-10-18T23:00:00-04:00', end: '2026-10-19T01:00:00-04:00' }),
      event({ id: 'other', calendar: 'Homework' }),
      event({ id: 'past', end: range.start.toISOString(), start: '2026-10-18T20:00:00-04:00' }),
      event({ id: 'future', start: range.end.toISOString(), end: '2026-10-20T01:00:00-04:00' }),
    ],
    ' Work , Lunar ',
    range,
  );
  assert.deepEqual(
    rows.map((e) => e.id),
    ['overnight', 'e', 'e'],
  );
  assert.notEqual(rows[1].key, rows[2].key);
  assert.equal(selectEvents([event()], '', range).length, 1);
  assert.equal(selectEvents([event()], 'Missing', range).length, 0);
});
test('formats all-day, timed and multi-day events with dates in Upcoming', () => {
  assert.equal(eventTimeLabel(event(), 'today'), '14:00–15:00');
  assert.equal(
    eventTimeLabel(
      event({ allDay: true, start: '2026-10-19T00:00:00-04:00', end: '2026-10-20T00:00:00-04:00' }),
      'today',
    ),
    'All day',
  );
  assert.match(eventTimeLabel(event(), 'upcoming'), /Oct 19.*14:00/);
  assert.match(eventTimeLabel(event({ end: '2026-10-20T15:00:00-04:00' }), 'today'), /Oct 20/);
});

const vm = require('node:vm');
const bridgeFile = path.resolve(__dirname, '../src/calendar-script.ts');
const bridge = { exports: {} };
new Function(
  'exports',
  ts.transpileModule(fs.readFileSync(bridgeFile, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } })
    .outputText,
)(bridge.exports);
const script = bridge.exports.calendarScript('2026-10-19T00:00:00Z', '2026-10-20T00:00:00Z');
function runBridge(status) {
  let queried = false;
  const nativeEvent = {
    calendar: { calendarIdentifier: 'cal', title: 'Work' },
    eventIdentifier: 'id',
    title: 'Meeting',
    startDate: { timeIntervalSince1970: 1792404000 },
    endDate: { timeIntervalSince1970: 1792407600 },
    isAllDay: false,
    status: 1,
  };
  const store = {
    calendarsForEntityType: () => ['native-calendar'],
    predicateForEventsWithStartDateEndDateCalendars: (start, end, calendars) => {
      assert.deepEqual(
        calendars,
        ['native-calendar'],
        'Pass a native calendar array; JXA null becomes NSNull, not nil',
      );
      queried = true;
      return {};
    },
    eventsMatchingPredicate: () => ({ count: 1, objectAtIndex: () => nativeEvent }),
    respondsToSelector: () => true,
    requestFullAccessToEventsWithCompletion: (callback) => callback(true, null),
  };
  const result = vm.runInNewContext(script, {
    ObjC: { import: () => {}, unwrap: (value) => value },
    $: {
      EKEventStore: { alloc: { init: store }, authorizationStatusForEntityType: () => status },
      NSDate: { dateWithTimeIntervalSince1970: (value) => value },
    },
  });
  return { result: JSON.parse(result), queried };
}
test('EventKit bridge serializes authorized occurrences', () => {
  const { result, queried } = runBridge(3);
  assert.equal(queried, true);
  assert.equal(result.events[0].calendar, 'Work');
  assert.equal(result.events[0].allDay, false);
  assert.equal(result.events[0].start, new Date(1792404000000).toISOString());
});
test('EventKit bridge never queries events without read access', () => {
  for (const status of [1, 2, 4]) {
    const { result, queried } = runBridge(status);
    assert.equal(queried, false);
    assert.match(result.error, /full calendar access/);
  }
});
test('EventKit bridge requests full access before the first read', () => {
  assert.equal(runBridge(0).result.events.length, 1);
});
