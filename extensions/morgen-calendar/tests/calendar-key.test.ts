import assert from "node:assert/strict";
import test from "node:test";
import { calendarKey } from "../src/lib/calendar-key";

test("calendar selection distinguishes duplicate IDs across accounts", () => {
  const calendars = [
    { accountId: "work", id: "primary" },
    { accountId: "personal", id: "primary" },
  ];
  const selected = calendarKey(calendars[1]);
  assert.notEqual(calendarKey(calendars[0]), selected);
  assert.deepEqual(calendars.find((calendar) => calendarKey(calendar) === selected), calendars[1]);
});

test("opaque account and calendar IDs do not collide when they contain separators", () => {
  assert.notEqual(calendarKey({ accountId: "a:b", id: "c" }), calendarKey({ accountId: "a", id: "b:c" }));
});
