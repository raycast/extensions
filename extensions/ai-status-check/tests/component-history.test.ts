import assert from "node:assert/strict";
import test from "node:test";
import {
  applyHistoryRange,
  componentHistory,
  historyWindow,
  markBeforeMonitoredSince,
} from "../src/providers/utils/component-history";
import { buildComponentHistoryMarkdown, formatUptimePercent } from "../src/utils/component-history-markdown";

test("normalizes calendar history without treating pre-monitoring days as healthy", () => {
  const days = historyWindow(3, new Date("2026-08-11T16:00:00Z"));
  applyHistoryRange(days, "2026-08-10T10:00:00Z", "2026-08-10T11:00:00Z", "partial_outage");
  markBeforeMonitoredSince(days, "2026-08-10T00:00:00Z");

  assert.deepEqual(days, [
    { date: "2026-08-09", level: "not_monitored" },
    { date: "2026-08-10", level: "partial_outage" },
    { date: "2026-08-11", level: "operational" },
  ]);
});

test("keeps an unfamiliar incident state visible instead of leaving the day green", () => {
  const days = historyWindow(1, new Date("2026-08-11T16:00:00Z"));
  applyHistoryRange(days, "2026-08-11T10:00:00Z", "2026-08-11T11:00:00Z", "unknown");

  assert.deepEqual(days, [{ date: "2026-08-11", level: "unknown" }]);
});

test("preserves provider precision but never derives uptime from green days", () => {
  const days = historyWindow(2, new Date("2026-08-11T16:00:00Z"));
  const chartOnly = componentHistory("incidents", days);
  const measured = componentHistory("availability", days, { uptimePercent: 99.996, uptimeText: "99.996%" });

  assert.doesNotMatch(buildComponentHistoryMarkdown(chartOnly) ?? "", /% uptime/);
  assert.match(buildComponentHistoryMarkdown(measured) ?? "", /99\.996% uptime/);
  assert.equal(formatUptimePercent(99.996), "99.996%");
  assert.equal(formatUptimePercent(99.9, "99.90%"), "99.90%");
  assert.equal(formatUptimePercent(100), "100%");
});

test("encodes every status level into the SVG chart", () => {
  const history = componentHistory("availability", [
    { date: "2026-08-09", level: "operational" },
    { date: "2026-08-10", level: "degraded" },
    { date: "2026-08-11", level: "major_outage" },
  ]);
  const markdown = buildComponentHistoryMarkdown(history);
  const encoded = /base64,([^\)]+)/.exec(markdown ?? "")?.[1];
  assert.ok(encoded);
  const svg = Buffer.from(encoded, "base64").toString("utf8");
  assert.match(svg, /#34C759/);
  assert.match(svg, /#FFD60A/);
  assert.match(svg, /#FF453A/);
});
