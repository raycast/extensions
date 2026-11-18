import assert from "node:assert/strict";
import test from "node:test";
import { canModifyEvent } from "../src/lib/event-permissions";
import type { Calendar, Event } from "../src/types";

const event: Event = {
  id: "event", accountId: "account", calendarId: "calendar", title: "Meeting",
  start: "2026-10-02T10:00:00", timeZone: "UTC", duration: "PT1H", showWithoutTime: false,
};
const calendar: Calendar = { id: "calendar", accountId: "account", name: "Calendar" };

test("read-only calendars cannot edit or delete events even when calendar deletion is allowed", () => {
  assert.equal(canModifyEvent({ ...calendar, myRights: { mayDelete: true } }, event), false);
  assert.equal(canModifyEvent(undefined, event), false);
});

test("write-all rights apply only to the event's matching account and calendar", () => {
  const writable = { ...calendar, myRights: { mayWriteAll: true } };
  assert.equal(canModifyEvent(writable, event), true);
  assert.equal(canModifyEvent({ ...writable, accountId: "another-account" }, event), false);
});

test("write-own rights require ownership or an explicitly ownerless event", () => {
  const ownOnly = { ...calendar, myRights: { mayWriteOwn: true } };
  assert.equal(canModifyEvent(ownOnly, event), false);
  assert.equal(canModifyEvent(ownOnly, { ...event, participants: {} }), true);
  assert.equal(canModifyEvent(ownOnly, { ...event, participants: { owner: { roles: { owner: true }, accountOwner: true } } }), true);
  assert.equal(canModifyEvent(ownOnly, { ...event, participants: { owner: { roles: { owner: true }, accountOwner: false } } }), false);
});
