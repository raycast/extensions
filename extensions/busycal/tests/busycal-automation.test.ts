import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBusyCalItemsQueryScript,
  buildCreateBusyCalNaturalLanguageItemScript,
  buildBusyCalTasksQueryScript,
  buildCreateBusyCalEventScript,
  buildCreateBusyCalTaskScript,
  buildOpenBusyCalItemScript,
  busyCalItemFromRecord,
  queryBusyCalItemsStrategy,
} from "../src/busycal-automation";
import { classifyBusyCalCommandSupportError } from "../src/busycal-command-support";

test("queryBusyCalItemsStrategy preserves BusyCal mixed-query semantics", () => {
  assert.equal(queryBusyCalItemsStrategy(undefined), "mixed");
  assert.equal(queryBusyCalItemsStrategy([]), "mixed");
  assert.equal(queryBusyCalItemsStrategy(["event", "task"]), "mixed");
  assert.equal(queryBusyCalItemsStrategy(["event", "journal"]), "mixed");
  assert.equal(queryBusyCalItemsStrategy(["task", "journal"]), "mixed");
  assert.equal(queryBusyCalItemsStrategy(["event"]), "mixed");
  assert.equal(queryBusyCalItemsStrategy(["task"]), "task");
});

test("buildBusyCalItemsQueryScript reads optional item fields defensively", () => {
  const script = buildBusyCalItemsQueryScript("com.busymac.busycal3", {
    itemTypes: ["event", "journal"],
    fetchLimit: 10,
  });

  assert.match(
    script,
    /query items given itemTypes:"event,journal", fetchLimit:10/,
  );
  assert.match(script, /set startDateValue to missing value/);
  assert.match(script, /set endDateValue to missing value/);
  assert.match(script, /set dueDateValue to missing value/);
  assert.match(script, /set locationValue to missing value/);
  assert.match(script, /set occurrenceDateValue to missing value/);
  assert.match(script, /set isFloatingValue to missing value/);
  assert.match(script, /my emitDateField\("startDate", startDateValue\)/);
  assert.match(script, /my emitDateField\("dueDate", dueDateValue\)/);
  assert.match(script, /my emitField\("location", locationValue\)/);
});

test("buildBusyCalItemsQueryScript omits itemTypes when the filter is empty", () => {
  const script = buildBusyCalItemsQueryScript("com.busymac.busycal3", {
    itemTypes: [],
    fetchLimit: 10,
  });

  assert.match(script, /query items given fetchLimit:10/);
  assert.doesNotMatch(script, /itemTypes:undefined/);
  assert.doesNotMatch(script, /itemTypes:/);
});

test("busyCalItemFromRecord normalizes a task primary date from dueDate", () => {
  const item = busyCalItemFromRecord({
    id: "task-id+795708000",
    title: "Floating task",
    type: "task",
    calendarID: "calendar-id",
    startDate: "2026-03-20T10:00:00Z",
    dueDate: "2026-03-20T14:00:00Z",
    occurrenceDate: "2026-03-20T14:00:00Z",
    seriesUID: "task-series",
    isFloating: "true",
  });

  assert.equal(item.primaryDate, "2026-03-20T14:00:00Z");
});

test("busyCalItemFromRecord normalizes an event primary date from startDate", () => {
  const item = busyCalItemFromRecord({
    id: "event-id+795711600",
    title: "Floating event",
    type: "event",
    calendarID: "calendar-id",
    startDate: "2026-03-20T15:00:00Z",
    dueDate: "2026-03-20T14:00:00Z",
    occurrenceDate: "2026-03-20T15:00:00Z",
    seriesUID: "event-series",
    isFloating: "true",
  });

  assert.equal(item.primaryDate, "2026-03-20T15:00:00Z");
});

test("buildCreateBusyCalEventScript serializes a literal event type", () => {
  const script = buildCreateBusyCalEventScript("com.busymac.busycal3", {
    title: "HELLO ray",
    startDate: "2026-03-20T11:30:00Z",
    endDate: "2026-03-20T11:35:00Z",
    calendarID: "calendar-id",
    allDay: false,
    location: "Apple Park",
    notes: "notes",
  });

  assert.match(script, /my emitField\("type", "event"\)/);
  assert.doesNotMatch(script, /type of createdEvent/);
});

test("buildCreateBusyCalEventScript reads optional event fields defensively", () => {
  const script = buildCreateBusyCalEventScript("com.busymac.busycal3", {
    title: "HELLO ray",
    startDate: "2026-03-20T11:30:00Z",
    endDate: "2026-03-20T11:35:00Z",
    allDay: false,
  });

  assert.match(script, /set locationValue to missing value/);
  assert.match(script, /set occurrenceDateValue to missing value/);
  assert.match(script, /set isFloatingValue to missing value/);
  assert.match(script, /my emitField\("location", locationValue\)/);
  assert.match(
    script,
    /my emitDateField\("occurrenceDate", occurrenceDateValue\)/,
  );
  assert.match(script, /my emitBooleanField\("isFloating", isFloatingValue\)/);
  assert.doesNotMatch(script, /my emitField\("location", location of createdEvent\)/);
  assert.doesNotMatch(
    script,
    /my emitDateField\("occurrenceDate", occurrenceDate of createdEvent\)/,
  );
  assert.doesNotMatch(
    script,
    /my emitBooleanField\("isFloating", isFloating of createdEvent\)/,
  );
});

test("buildCreateBusyCalTaskScript serializes a literal task type", () => {
  const script = buildCreateBusyCalTaskScript("com.busymac.busycal3", {
    title: "HELLO ray",
    dueDate: "2026-03-20T10:00:00Z",
    calendarID: "calendar-id",
    notes: "notes",
  });

  assert.match(script, /my emitField\("type", "task"\)/);
  assert.doesNotMatch(script, /type of createdTask/);
});

test("buildCreateBusyCalTaskScript reads optional task fields defensively", () => {
  const script = buildCreateBusyCalTaskScript("com.busymac.busycal3", {
    title: "PPPPPP",
    calendarID: "calendar-id",
  });

  assert.match(script, /set dueDateValue to missing value/);
  assert.match(script, /set occurrenceDateValue to missing value/);
  assert.match(script, /set isFloatingValue to missing value/);
  assert.match(script, /my emitDateField\("dueDate", dueDateValue\)/);
  assert.match(
    script,
    /my emitDateField\("occurrenceDate", occurrenceDateValue\)/,
  );
  assert.match(script, /my emitBooleanField\("isFloating", isFloatingValue\)/);
  assert.doesNotMatch(
    script,
    /my emitDateField\("dueDate", dueDate of createdTask\)/,
  );
  assert.doesNotMatch(
    script,
    /my emitDateField\("occurrenceDate", occurrenceDate of createdTask\)/,
  );
  assert.doesNotMatch(
    script,
    /my emitBooleanField\("isFloating", isFloating of createdTask\)/,
  );
});

test("buildCreateBusyCalNaturalLanguageItemScript uses the NLP AppleScript command", () => {
  const script = buildCreateBusyCalNaturalLanguageItemScript(
    "com.busymac.busycal3",
    {
      text: "Finish report tomorrow",
      itemType: "task",
    },
  );

  assert.match(
    script,
    /set createdItem to create natural language item given text:"Finish report tomorrow", itemType:"task"/,
  );
  assert.match(script, /set startDateValue to missing value/);
  assert.match(script, /set dueDateValue to missing value/);
  assert.match(script, /my emitField\("type", \|type\| of createdItem\)/);
  assert.match(script, /my emitDateField\("dueDate", dueDateValue\)/);
  assert.doesNotMatch(script, /busycalevent:\/\//);
});

test("queryBusyCalTasks reads optional task fields defensively", () => {
  const script = buildBusyCalTasksQueryScript("com.busymac.busycal3", {
    fetchLimit: 10,
  });

  assert.match(script, /query tasks given fetchLimit:10/);
  assert.match(script, /set dueDateValue to missing value/);
  assert.match(script, /set occurrenceDateValue to missing value/);
  assert.match(script, /set isFloatingValue to missing value/);
  assert.doesNotMatch(script, /my emitDateField\("dueDate", dueDate of itemRecord\)/);
  assert.doesNotMatch(
    script,
    /my emitDateField\("occurrenceDate", occurrenceDate of itemRecord\)/,
  );
  assert.doesNotMatch(
    script,
    /my emitBooleanField\("isFloating", isFloating of itemRecord\)/,
  );
});

test("buildOpenBusyCalItemScript reads optional fields defensively", () => {
  const script = buildOpenBusyCalItemScript(
    "com.busymac.busycal3",
    "UID-123+720462600+x-coredata://store/SyncableEvent/p1",
  );

  assert.match(
    script,
    /set openedItem to open item given itemID:"UID-123\+720462600\+x-coredata:\/\/store\/SyncableEvent\/p1"/,
  );
  assert.match(script, /set startDateValue to missing value/);
  assert.match(script, /set dueDateValue to missing value/);
  assert.match(script, /set isFloatingValue to missing value/);
  assert.match(script, /my emitField\("type", \|type\| of openedItem\)/);
  assert.doesNotMatch(script, /type of openedItem/);
  assert.match(script, /my emitDateField\("occurrenceDate", occurrenceDateValue\)/);
  assert.match(script, /my emitBooleanField\("isFloating", isFloatingValue\)/);
});

test("classifyBusyCalCommandSupportError recognizes outdated NLP command errors", () => {
  assert.equal(
    classifyBusyCalCommandSupportError(
      "2669:2676: syntax error: Expected end of line but found identifier. (-2741)",
      "create natural language item",
      '<suite><command name="list calendars"/></suite>',
    ),
    true,
  );
  assert.equal(
    classifyBusyCalCommandSupportError(
      "BusyCal got an error: doesn’t understand the create natural language item message.",
      "create natural language item",
    ),
    true,
  );
  assert.equal(
    classifyBusyCalCommandSupportError(
      "BusyCal got an error: file not found.",
      "create natural language item",
    ),
    false,
  );
});
