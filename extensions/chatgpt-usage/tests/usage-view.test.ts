import assert from "node:assert/strict";
import { test } from "node:test";
import { formatProgressBar, parseUsage } from "../src/lib/usage";
import { usageMarkdown } from "../src/lib/usage-view";

const now = Date.UTC(2026, 9, 10, 12);
const usage = parseUsage(
  {
    rateLimits: {
      primary: { usedPercent: 29, windowDurationMins: 300, resetsAt: now / 1000 + 43 * 60 },
      secondary: { usedPercent: 56, windowDurationMins: 10080, resetsAt: now / 1000 + (3 * 24 + 18) * 3600 },
    },
  },
  "plus",
  now,
);

test("the inline view shows remaining allowance, progress bars, and reset times", () => {
  const markdown = usageMarkdown(usage, undefined, false, now);
  assert.ok(markdown.includes("71% left"));
  assert.ok(markdown.includes("44% left"));
  assert.ok(markdown.includes("Resets in 43m"));
  assert.ok(markdown.includes("Resets in 3d 18h"));
  assert.ok(markdown.includes(formatProgressBar(71, 20)));
  assert.ok(markdown.includes("Chat conversations aren't included"));
});

test("inline loading and error states don't invent remaining allowance", () => {
  assert.ok(usageMarkdown(undefined).includes("Loading"));
  const markdown = usageMarkdown(undefined, "Run codex login");
  assert.ok(markdown.includes("Usage unavailable"));
  assert.ok(markdown.includes("Run codex login"));
  assert.ok(!markdown.includes("% left"));
});

test("the inline view clearly marks cached data after a failed refresh", () => {
  const markdown = usageMarkdown(usage, "Connection unavailable", true, now);
  assert.ok(markdown.includes("Last known usage"));
  assert.ok(markdown.includes("Connection unavailable"));
  assert.ok(markdown.includes("71% left"));
});

test("the inline view hides an expired window's old percentage", () => {
  const markdown = usageMarkdown(usage, undefined, false, now + 44 * 60000);
  assert.ok(markdown.includes("Awaiting refresh"));
  assert.ok(!markdown.includes("71% left"));
  assert.ok(markdown.includes("44% left"));
});

test("no reported windows isn't presented as an unlimited allowance", () => {
  const markdown = usageMarkdown({ ...usage, windows: [] }, undefined, false, now);
  assert.ok(markdown.includes("No fixed plan limits are reported"));
  assert.ok(!markdown.includes("100%"));
});

test("progress bars accurately represent empty, full, and partial allowances", () => {
  assert.equal(formatProgressBar(0), "▱".repeat(10));
  assert.equal(formatProgressBar(100), "▰".repeat(10));
  assert.equal(formatProgressBar(71), `${"▰".repeat(7)}${"▱".repeat(3)}`);
  assert.equal(formatProgressBar(44, 20), `${"▰".repeat(9)}${"▱".repeat(11)}`);
});
