import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEventResource, serializeEvent } from "./events";

describe("buildEventResource", () => {
  it("constructs timed and all-day schedules", () => {
    const timed = buildEventResource(
      { title: "Sync", startDate: "2026-07-20T10:00:00+02:00", duration: 45 },
      { isCreate: true, defaultDurationMinutes: 30 },
    );
    assert.deepEqual(timed.start, { dateTime: "2026-07-20T10:00:00+02:00" });
    assert.deepEqual(timed.end, { dateTime: "2026-07-20T08:45:00.000Z" });

    const allDay = buildEventResource(
      { title: "Offsite", startDate: "2026-07-20", allDay: true, durationDays: 2 },
      { isCreate: true },
    );
    assert.deepEqual(allDay.start, { date: "2026-07-20" });
    assert.deepEqual(allDay.end, { date: "2026-07-22" });
  });

  it("preserves an existing duration when only the start moves", () => {
    const body = buildEventResource(
      { startDate: "2026-07-21T14:00:00Z" },
      {
        existing: {
          start: { dateTime: "2026-07-20T09:00:00Z" },
          end: { dateTime: "2026-07-20T10:30:00Z" },
        },
      },
    );
    assert.equal(body.end?.dateTime, "2026-07-21T15:30:00.000Z");
  });

  it("omits untouched patch fields and keeps explicit clearing", () => {
    assert.deepEqual(buildEventResource({}, { existing: { summary: "Existing" } }), {});
    assert.deepEqual(buildEventResource({ description: "", location: "", recurrence: "", attendees: "", color: "" }), {
      description: "",
      location: "",
      attendees: [],
      recurrence: [],
      colorId: null,
    });
    assert.deepEqual(buildEventResource({ eventLabelId: "" }), { eventLabelId: "" });
  });

  it("categorizes and de-duplicates attendees", () => {
    const body = buildEventResource({
      requiredAttendees: "Alice <alice@example.com>",
      optionalAttendees: "bob@example.com",
      resourceAttendees: "room@example.com",
    });
    assert.deepEqual(body.attendees, [
      { email: "alice@example.com" },
      { email: "bob@example.com", optional: true },
      { email: "room@example.com", resource: true },
    ]);
  });

  it("validates recurrence and reminder contracts", () => {
    assert.deepEqual(buildEventResource({ recurrence: "FREQ=WEEKLY;BYDAY=MO" }).recurrence, [
      "RRULE:FREQ=WEEKLY;BYDAY=MO",
    ]);
    assert.throws(() => buildEventResource({ recurrence: "DTSTART:20260720T090000Z" }), /must not include DTSTART/);
    assert.throws(() => buildEventResource({ recurrence: "RRULE:COUNT=4" }), /must include FREQ/);
    assert.throws(() => buildEventResource({ popupReminderMinutes: "ten" }), /invalid number/);
    assert.throws(
      () => buildEventResource({ useDefaultReminders: true, popupReminderMinutes: "10" }),
      /cannot be combined/,
    );
    assert.throws(
      () =>
        buildEventResource(
          {
            startDate: "2026-07-20T09:00:00Z",
            duration: 30,
            recurrence: "RRULE:FREQ=DAILY",
          },
          { isCreate: true },
        ),
      /timeZone is required/,
    );
  });

  it("rejects custom labels combined with legacy colors", () => {
    assert.throws(() => buildEventResource({ eventLabelId: "label-1", color: "sage" }), /cannot be used together/);
  });
});

describe("serializeEvent", () => {
  it("returns rich event details and calculated durations", () => {
    const serialized = serializeEvent(
      {
        id: "evt-1",
        iCalUID: "ical-1",
        summary: "Planning",
        start: { dateTime: "2026-07-20T09:00:00Z", timeZone: "Europe/Paris" },
        end: { dateTime: "2026-07-20T10:30:00Z" },
        attendees: [
          { email: "owner@example.com", self: true, responseStatus: "accepted" },
          { email: "guest@example.com", optional: true, responseStatus: "tentative" },
        ],
        colorId: "2",
        conferenceData: {
          conferenceId: "meet-1",
          conferenceSolution: { name: "Google Meet" },
          entryPoints: [{ entryPointType: "video", uri: "https://meet.google.com/abc" }],
        },
        reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 10 }] },
        htmlLink: "https://calendar.google.com/event?eid=evt-1",
        eventLabelId: "label-1",
      },
      "primary",
      [{ id: "label-1", name: "Customer", backgroundColor: "#039be5" }],
    );

    assert.equal(serialized.durationMinutes, 90);
    assert.equal(serialized.timeZone, "Europe/Paris");
    assert.deepEqual(serialized.color, { id: "2", name: "Sage" });
    assert.deepEqual(serialized.eventLabel, {
      id: "label-1",
      name: "Customer",
      backgroundColor: "#039be5",
    });
    assert.equal(serialized.attendees[1].optional, true);
    assert.equal(serialized.conference?.entryPoints?.[0].uri, "https://meet.google.com/abc");
    assert.equal(serialized.htmlLink, "https://calendar.google.com/event?eid=evt-1");
  });
});
