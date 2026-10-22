import assert from "node:assert/strict";
import test from "node:test";
import { loadEventsByAccount } from "../src/lib/event-loader";
import type { Calendar, Event } from "../src/types";

const calendars: Calendar[] = [
  { id: "primary", accountId: "work", name: "Work" },
  { id: "team", accountId: "work", name: "Team" },
  { id: "primary", accountId: "personal", name: "Personal" },
];
const start = new Date("2026-10-14T00:00:00Z");
const end = new Date("2026-10-21T00:00:00Z");
const event: Event = {
  id: "meeting", accountId: "work", calendarId: "primary", title: "Design review",
  start: "2026-10-14T10:00:00", timeZone: "UTC", duration: "PT1H", showWithoutTime: false,
};

test("a failed account does not hide successful account events", async () => {
  const calls: URLSearchParams[] = [];
  const error = new Error("Reconnect calendar");
  const result = await loadEventsByAccount(calendars, start, end, async (params) => {
    calls.push(params);
    if (params.get("accountId") === "personal") throw error;
    return [event];
  });
  assert.deepEqual(result.events, [event]);
  assert.deepEqual(result.failures, [{ accountId: "personal", error }]);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].get("calendarIds"), "primary,team");
  assert.equal(calls[1].get("calendarIds"), "primary");
  assert.equal(calls[0].get("start"), start.toISOString());
});

test("an empty successful calendar is distinct from an account failure", async () => {
  const result = await loadEventsByAccount(calendars, start, end, async () => []);
  assert.deepEqual(result, { events: [], failures: [] });
});

test("all account failures are returned for a visible error", async () => {
  const result = await loadEventsByAccount(calendars, start, end, async () => { throw new Error("Unavailable"); });
  assert.deepEqual(result.events, []);
  assert.deepEqual(result.failures.map((failure) => failure.accountId), ["work", "personal"]);
});
