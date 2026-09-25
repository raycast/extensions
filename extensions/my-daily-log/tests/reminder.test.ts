import assert from "node:assert/strict";
import { test } from "node:test";
import { getReminderState, ReminderSettings } from "../src/shared/reminder";

const settings: ReminderSettings = {
  intervalMinutes: 60,
  startMinutes: 9 * 60,
  endMinutes: 18 * 60,
  weekdaysOnly: true,
};
// Thursday 24 September 2026
const at = (hours: number, minutes = 0, day = 24) => new Date(2026, 8, day, hours, minutes);

test("not active outside working hours or on weekends", () => {
  assert.equal(getReminderState(at(8), undefined, settings).isActive, false);
  assert.equal(getReminderState(at(19), undefined, settings).isActive, false);
  assert.equal(getReminderState(at(11, 0, 26), undefined, settings).isActive, false); // Saturday
  assert.equal(getReminderState(at(11, 0, 26), undefined, { ...settings, weekdaysOnly: false }).isActive, true);
});

test("due one interval after the start of the day or the last log", () => {
  assert.equal(getReminderState(at(9, 30), undefined, settings).isDue, false);
  assert.equal(getReminderState(at(10, 0), undefined, settings).isDue, true);
  assert.equal(getReminderState(at(10, 30), at(10), settings).isDue, false);
  assert.equal(getReminderState(at(11, 5), at(10), settings).isDue, true);
  // A log from yesterday doesn't count.
  assert.equal(getReminderState(at(9, 30), at(17, 0, 23), settings).isDue, false);
});

test("snoozing postpones reminders", () => {
  assert.equal(getReminderState(at(12), at(10), settings, at(12, 30)).isDue, false);
  assert.equal(getReminderState(at(13), at(10), settings, at(12, 30)).isDue, false);
  assert.equal(getReminderState(at(13, 30), at(10), settings, at(12, 30)).isDue, true);
});

test("never due after the end of the working hours", () => {
  assert.equal(getReminderState(at(17, 50), at(17, 30), settings).isDue, false);
});

test("working hours crossing midnight", () => {
  const night: ReminderSettings = { ...settings, startMinutes: 22 * 60, endMinutes: 6 * 60 };
  assert.equal(getReminderState(at(23, 30), undefined, night).isDue, true);
  assert.equal(getReminderState(at(2, 0, 25), at(1, 30, 25), night).isDue, false);
  assert.equal(getReminderState(at(12), undefined, night).isActive, false);
});
