import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatEventTime,
  parseEventMentionUri,
  rankEventMentions,
  readEventMention,
  toEventMentions,
  toEventMentionUri,
  toMentionEvents,
  type MentionEvent,
} from "./event-mentions";

const now = new Date("2026-11-04T12:00:00Z");

function event(id: string, start: string, end: string, extra: Partial<MentionEvent> = {}): MentionEvent {
  return { id, calendarId: "primary", title: id, start, end, allDay: false, ...extra };
}

describe("toMentionEvents", () => {
  it("keeps the fields mentions need and drops cancelled or incomplete events", () => {
    assert.deepEqual(
      toMentionEvents(
        [
          {
            id: "a",
            summary: " Sync ",
            start: { dateTime: "2026-11-04T14:00:00Z" },
            end: { dateTime: "2026-11-04T15:00:00Z" },
            recurringEventId: "series",
            description: "not cached",
          },
          { id: "b", start: { date: "2026-11-05" }, end: { date: "2026-11-06" } },
          { id: "c", status: "cancelled", start: { dateTime: "2026-11-04T14:00:00Z" } },
          { start: { dateTime: "2026-11-04T14:00:00Z" } },
          { id: "d" },
        ],
        "team@example.com",
        "Team",
      ),
      [
        {
          id: "a",
          calendarId: "team@example.com",
          calendarName: "Team",
          title: "Sync",
          start: "2026-11-04T14:00:00Z",
          end: "2026-11-04T15:00:00Z",
          allDay: false,
          recurringEventId: "series",
        },
        {
          id: "b",
          calendarId: "team@example.com",
          calendarName: "Team",
          title: "Untitled Event",
          start: "2026-11-05",
          end: "2026-11-06",
          allDay: true,
        },
      ],
    );
  });
});

describe("rankEventMentions", () => {
  it("lists ongoing and upcoming events soonest first, then past events most recent first", () => {
    const ranked = rankEventMentions(
      [
        event("old", "2026-10-01T10:00:00Z", "2026-10-01T11:00:00Z"),
        event("later", "2026-11-06T10:00:00Z", "2026-11-06T11:00:00Z"),
        event("ongoing", "2026-11-04T11:30:00Z", "2026-11-04T12:30:00Z"),
        event("recent", "2026-11-03T10:00:00Z", "2026-11-03T11:00:00Z"),
        event("soon", "2026-11-04T13:00:00Z", "2026-11-04T14:00:00Z"),
      ],
      now,
    );
    assert.deepEqual(
      ranked.map((item) => item.id),
      ["ongoing", "soon", "later", "recent", "old"],
    );
  });

  it("keeps only the next and the most recent occurrence of a recurring series", () => {
    const weekly = (id: string, day: string) =>
      event(id, `2026-${day}T09:00:00Z`, `2026-${day}T09:30:00Z`, { recurringEventId: "weekly" });
    const ranked = rankEventMentions(
      [weekly("w1", "10-21"), weekly("w2", "10-28"), weekly("w3", "11-11"), weekly("w4", "11-18")],
      now,
    );
    assert.deepEqual(
      ranked.map((item) => item.id),
      ["w3", "w2"],
    );
  });

  it("shows an event shared across calendars once", () => {
    const ranked = rankEventMentions(
      [
        event("shared", "2026-11-05T10:00:00Z", "2026-11-05T11:00:00Z"),
        event("shared", "2026-11-05T10:00:00Z", "2026-11-05T11:00:00Z", { calendarId: "team@example.com" }),
      ],
      now,
    );
    assert.equal(ranked.length, 1);
    assert.equal(ranked[0].calendarId, "primary");
  });
});

describe("toEventMentions", () => {
  it("describes when and where each event is and caps results at 50", () => {
    const mentions = toEventMentions(
      [
        event("abc_20261104T140000Z", "2026-11-04T14:00:00Z", "2026-11-04T15:00:00Z", {
          title: "Design review",
          calendarName: "Work",
        }),
        { id: "trip", calendarId: "primary", title: "Paris", start: "2026-11-09", end: "2026-11-12", allDay: true },
        { id: "day", calendarId: "primary", title: "Holiday", start: "2026-11-09", end: "2026-11-10", allDay: true },
      ],
      "calendar",
      { locale: "en-GB", timeZone: "Europe/London" },
    );
    assert.deepEqual(mentions[0], {
      title: "Design review",
      uri: "google-calendar://events/primary/abc_20261104T140000Z",
      description: "Wed 4 Nov, 14:00 · Work",
      icon: "calendar",
    });
    assert.equal(mentions[1].description, "Mon 9 Nov, 3 days");
    assert.equal(mentions[2].description, "Mon 9 Nov, all day");

    const many = Array.from({ length: 60 }, (_, i) => event(`e${i}`, "2026-11-05T10:00:00Z", "2026-11-05T11:00:00Z"));
    assert.equal(toEventMentions(many, "calendar").length, 50);
  });

  it("formats all-day events as calendar days regardless of time zone", () => {
    const allDay = { id: "x", calendarId: "primary", title: "x", start: "2026-11-09", allDay: true };
    assert.equal(formatEventTime(allDay, { locale: "en-GB", timeZone: "America/Los_Angeles" }), "Mon 9 Nov, all day");
  });
});

describe("parseEventMentionUri", () => {
  it("round-trips calendar and event IDs that contain reserved characters", () => {
    const uri = toEventMentionUri("team#group@group.calendar.google.com", "abc_20261104T140000Z");
    assert.deepEqual(parseEventMentionUri(uri), {
      calendarId: "team#group@group.calendar.google.com",
      eventId: "abc_20261104T140000Z",
    });
  });

  it("rejects other URIs", () => {
    for (const uri of [
      "google-calendar://contacts/alice%40example.com",
      "google-calendar://events/primary",
      "google-calendar://events//abc",
      "google-calendar://events/primary/abc/extra",
      "google-calendar://events/primary/%E0%A4%A",
    ]) {
      assert.throws(() => parseEventMentionUri(uri), /Invalid Google Calendar event URI/);
    }
  });
});

describe("readEventMention", () => {
  it("returns the current event from its calendar", async () => {
    const calls: string[][] = [];
    const resource = await readEventMention("google-calendar://events/primary/abc", async (calendarId, eventId) => {
      calls.push([calendarId, eventId]);
      return { id: "abc", title: "Design review", start: "2026-11-04T14:00:00Z" };
    });
    assert.deepEqual(calls, [["primary", "abc"]]);
    assert.equal(resource.mimeType, "application/json");
    assert.deepEqual(JSON.parse(resource.text), { id: "abc", title: "Design review", start: "2026-11-04T14:00:00Z" });
  });

  it("explains when the event was cancelled after it was mentioned", async () => {
    await assert.rejects(
      readEventMention("google-calendar://events/primary/abc", async () => ({ id: "abc", status: "cancelled" })),
      /no longer available/,
    );
  });

  it("explains when the event was deleted", async () => {
    await assert.rejects(
      readEventMention("google-calendar://events/primary/abc", async () => {
        throw Object.assign(new Error("Not Found"), { code: 404 });
      }),
      /no longer available/,
    );
  });
});
