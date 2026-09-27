import { expect, it } from "vitest";
import { eventMeeting, ScheduleEvent } from "../src/lib/schedule-model";

/** A minimal event with only the fields `eventMeeting` / `scrapeMeetingLink` read. */
function event(overrides: Partial<ScheduleEvent> = {}): ScheduleEvent {
  return {
    id: "e1",
    date: "2026-09-22",
    start: "09:00",
    end: "10:00",
    durationMinutes: 60,
    name: "Standup",
    ...overrides,
  };
}

it.each([
  ["Join: https://zoom.us/j/123456?pwd=abc.", "https://zoom.us/j/123456?pwd=abc"],
  ["Link: https://meet.google.com/abc-defg-hij, click join", "https://meet.google.com/abc-defg-hij"],
  ["See https://whereby.com/room; password below", "https://whereby.com/room"],
  [">>> https://webex.com/meet/123! <<<", "https://webex.com/meet/123"],
])("strips trailing prose punctuation (.,;!) from an inline meeting URL: %j", (notes, expected) => {
  expect(eventMeeting(event({ notes }))?.url).toBe(expected);
});

it("strips multiple trailing prose-punctuation characters at once", () => {
  expect(eventMeeting(event({ notes: "Call https://zoom.us/j/123?pwd=abc...." }))?.url).toBe(
    "https://zoom.us/j/123?pwd=abc",
  );
  expect(eventMeeting(event({ notes: "Call https://zoom.us/j/123?pwd=abc.,!" }))?.url).toBe(
    "https://zoom.us/j/123?pwd=abc",
  );
});

it("returns the URL unchanged when punctuation appears inside the URL but not at the end", () => {
  expect(eventMeeting(event({ notes: "Join https://whereby.com/room?x=1,2,3 now" }))?.url).toBe(
    "https://whereby.com/room?x=1,2,3",
  );
});

it('preserves a trailing "?" (a valid empty query) rather than stripping it', () => {
  expect(eventMeeting(event({ notes: "Join https://zoom.us/j/123?" }))?.url).toBe("https://zoom.us/j/123?");
});

it("passes the API meeting.url through verbatim, including any trailing punctuation", () => {
  // The API field is trusted and is not run through the scraper; trailing
  // punctuation there is the server's responsibility, not the scraper's.
  expect(eventMeeting(event({ meeting: { url: "https://zoom.us/j/123?pwd=abc." } }))).toEqual({
    url: "https://zoom.us/j/123?pwd=abc.",
  });
});

it("prefers the API meeting.url over a scraped link in notes", () => {
  expect(
    eventMeeting(
      event({
        meeting: { url: "https://zoom.us/j/999?pwd=api" },
        notes: "https://meet.google.com/abc-defg-hij.",
      }),
    ),
  ).toEqual({ url: "https://zoom.us/j/999?pwd=api" });
});

it.each([".", ",", ";", "!", ")"])("preserves structured sourceUrl ending with %s", (suffix) => {
  const sourceUrl = `https://zoom.us/j/123?pwd=abc${suffix}`;
  expect(eventMeeting(event({ sourceUrl }))?.url).toBe(sourceUrl);
});

it("preserves encoded punctuation and prefers a scraped note to sourceUrl", () => {
  const notes = "Join https://zoom.us/j/123?pwd=abc%21.";
  expect(eventMeeting(event({ notes, sourceUrl: "https://whereby.com/other" }))?.url).toBe(
    "https://zoom.us/j/123?pwd=abc%21",
  );
});

it("returns null when notes have a URL but no conferencing host", () => {
  expect(eventMeeting(event({ notes: "Read https://example.com/article." }))).toBeNull();
});
