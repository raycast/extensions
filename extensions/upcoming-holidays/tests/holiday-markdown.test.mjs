import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMarkdown } from "../src/holiday-markdown.ts";

test("Remembrance Day countdown uses calendar days throughout the day", () => {
  const holidays = [{ name: "Remembrance Day", date: new Date(2026, 10, 11) }];
  for (const hour of [0, 13, 23]) {
    assert.equal(
      buildMarkdown(holidays, new Date(2026, 10, 9, hour, 59)),
      "### Remembrance Day\n\nWednesday, November 11th (in 2 days)",
    );
  }
  for (const hour of [0, 13, 23]) {
    assert.match(buildMarkdown(holidays, new Date(2026, 10, 10, hour, 59)), /\(tomorrow\)$/);
    assert.match(buildMarkdown(holidays, new Date(2026, 10, 11, hour, 59)), /\(today\)$/);
  }
});

test("countdown counts calendar days across daylight saving changes and year boundaries", () => {
  for (const [now, date] of [
    [new Date(2026, 2, 7, 23, 59), new Date(2026, 2, 9)],
    [new Date(2026, 9, 31, 23, 59), new Date(2026, 10, 2)],
    [new Date(2026, 11, 30, 23, 59), new Date(2027, 0, 1)],
  ]) {
    assert.match(buildMarkdown([{ name: "Holiday", date }], now), /\(in 2 days\)$/);
  }
});

test("missing holidays produce empty markdown", () => {
  assert.equal(buildMarkdown(undefined), "");
  assert.equal(buildMarkdown([]), "");
});
