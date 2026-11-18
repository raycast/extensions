import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBusyCalEventInput,
  buildBusyCalTaskInput,
} from "../src/busycal-form-submission";

test("buildBusyCalEventInput trims fields and omits empty optional values", () => {
  const startDate = new Date(2026, 2, 19, 9, 30, 45);
  const endDate = new Date(2026, 2, 19, 10, 30, 45);

  const input = buildBusyCalEventInput({
    title: "  Team sync  ",
    calendarID: "",
    startDate,
    endDate,
    allDay: false,
    location: "   ",
    notes: "  Agenda review  ",
  });

  assert.equal(input.title, "Team sync");
  assert.equal(input.calendarID, undefined);
  assert.equal(input.location, undefined);
  assert.equal(input.notes, "Agenda review");
  assert.equal(input.allDay, false);
  assert.ok(input.startDate.startsWith("2026-03-19T09:30:45"));
  assert.ok(input.endDate.startsWith("2026-03-19T10:30:45"));
});

test("buildBusyCalEventInput preserves all-day dates as yyyy-MM-dd", () => {
  const input = buildBusyCalEventInput({
    title: "Offsite",
    calendarID: "work",
    startDate: new Date(Date.UTC(2026, 2, 20, 12, 0, 0)),
    endDate: new Date(Date.UTC(2026, 2, 21, 12, 0, 0)),
    allDay: true,
    location: "HQ",
    notes: "",
  });

  assert.equal(input.calendarID, "work");
  assert.equal(input.location, "HQ");
  assert.equal(input.startDate, "2026-03-20");
  assert.equal(input.endDate, "2026-03-21");
});

test("buildBusyCalEventInput rejects blank titles and inverted ranges", () => {
  const startDate = new Date(2026, 2, 19, 11, 0, 0);
  const endDate = new Date(2026, 2, 19, 10, 0, 0);

  assert.throws(
    () =>
      buildBusyCalEventInput({
        title: "   ",
        calendarID: "",
        startDate,
        endDate: startDate,
        allDay: false,
        location: "",
        notes: "",
      }),
    /Enter an event title/,
  );

  assert.throws(
    () =>
      buildBusyCalEventInput({
        title: "Team sync",
        calendarID: "",
        startDate,
        endDate,
        allDay: false,
        location: "",
        notes: "",
      }),
    /end time must be on or after the start time/,
  );
});

test("buildBusyCalTaskInput trims fields and omits an empty due date", () => {
  const input = buildBusyCalTaskInput({
    title: "  Finish expense report  ",
    calendarID: "",
    hasDueDate: false,
    dueDate: new Date(2026, 2, 19, 17, 45, 0),
    notes: "   ",
  });

  assert.equal(input.title, "Finish expense report");
  assert.equal(input.calendarID, undefined);
  assert.equal(input.dueDate, undefined);
  assert.equal(input.notes, undefined);
});

test("buildBusyCalTaskInput formats a due date when enabled", () => {
  const input = buildBusyCalTaskInput({
    title: "Call Sam",
    calendarID: "tasks",
    hasDueDate: true,
    dueDate: new Date(2026, 2, 19, 17, 45, 30),
    notes: "  Before dinner ",
  });

  assert.equal(input.calendarID, "tasks");
  assert.equal(input.notes, "Before dinner");
  assert.ok(input.dueDate?.startsWith("2026-03-19T17:45:30"));
});

test("buildBusyCalTaskInput rejects blank titles", () => {
  assert.throws(
    () =>
      buildBusyCalTaskInput({
        title: "  ",
        calendarID: "",
        hasDueDate: false,
        dueDate: new Date(),
        notes: "",
      }),
    /Enter a task title/,
  );
});
