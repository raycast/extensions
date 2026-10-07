import assert from "node:assert/strict";
import { test } from "node:test";
import { graphDate, notesMarkdown, plainNotes } from "../src/task-display";

test("HTML notes become readable literal text", () => {
  const task = {
    id: "local",
    title: "Example",
    status: "notStarted",
    body: {
      content:
        "<p>Call <strong>mum</strong></p><p>[bad](https://example.com)</p>",
      contentType: "html",
    },
  };
  assert.match(plainNotes(task), /Call mum/);
  assert.doesNotMatch(plainNotes(task), /<strong>/);
  assert.match(notesMarkdown(task), /^    Call mum/m);
  assert.match(notesMarkdown(task), /^    \[bad\]/m);
});

test("UTC due dates keep their day in eastern reader zones", () => {
  const midnight = { dateTime: "2026-09-25T00:00:00.0000000", timeZone: "UTC" };
  assert.equal(graphDate(midnight, true, "America/New_York"), "2026-09-25");
  assert.equal(graphDate(midnight, true, "Europe/London"), "2026-09-25");
  for (const zone of ["Pacific/Tongatapu", "Pacific/Kiritimati"]) {
    assert.equal(graphDate(midnight, true, zone), "2026-09-25");
    assert.equal(
      graphDate(
        { dateTime: "2026-09-24T23:00:00.0000000", timeZone: "UTC" },
        true,
        zone,
      ),
      "2026-09-25",
    );
    assert.equal(
      graphDate(
        { dateTime: "2026-09-24T20:00:00.0000000", timeZone: "UTC" },
        true,
        zone,
      ),
      "2026-09-25",
    );
  }
  const londonMidnight = {
    dateTime: "2026-09-24T23:00:00.0000000",
    timeZone: "UTC",
  };
  assert.equal(graphDate(londonMidnight, true, "Europe/London"), "2026-09-25");
  assert.equal(
    graphDate(
      { dateTime: "2026-09-24T11:00:00.0000000", timeZone: "UTC" },
      true,
      "Pacific/Tongatapu",
    ),
    "2026-09-25",
  );
  assert.equal(
    graphDate(
      { dateTime: "2026-09-24T10:00:00.0000000", timeZone: "UTC" },
      true,
      "Pacific/Kiritimati",
    ),
    "2026-09-25",
  );
});

test("non-UTC due responses are wall time", () => {
  const nonUtc = {
    dateTime: "2026-09-25T00:00:00.0000000",
    timeZone: "Europe/London",
  };
  assert.equal(graphDate(nonUtc, true, "America/New_York"), "2026-09-25");
  assert.equal(
    graphDate(
      { dateTime: "2026-09-25T13:00:00.0000000", timeZone: "Europe/London" },
      true,
      "Pacific/Kiritimati",
    ),
    "2026-09-26",
  );
});
