import assert from "node:assert/strict";
import test from "node:test";
import { parseXaiComponentHistory, parseXaiStatusPage } from "../src/providers/adapters/xai";
import { textFixture } from "./support/fixtures";

test("discovers every live xAI service from the rendered status payload", async () => {
  const parsed = parseXaiStatusPage(await textFixture("html-rss/xai-status.rsc"));

  assert.equal(parsed.reportedHealth, "operational");
  assert.equal(parsed.statusText, "No incidents declared");
  assert.deepEqual(parsed.components, [
    {
      id: "api-us-east-1",
      name: "API (us-east-1.api.x.ai)",
      health: "operational",
      statusText: "available",
      url: "https://status.x.ai/api-us-east-1",
    },
    {
      id: "docs",
      name: "Docs",
      health: "operational",
      statusText: "available",
      url: "https://status.x.ai/docs",
    },
  ]);
  assert.throws(() => parseXaiStatusPage("not rsc"), /was malformed/);
});
test("reproduces xAI's official 30-day incident chart without inventing uptime", () => {
  const payload = {
    name: "Grok (iOS)",
    slug: "ios-app",
    incidents: [
      {
        status: "resolved",
        startTime: "2026-08-10T10:00:00Z",
        endTime: "2026-08-11T11:00:00Z",
        severity: "available",
        updates: [
          { createTime: "2026-08-10T10:00:00Z", severity: "info" },
          { createTime: "2026-08-11T09:00:00Z", severity: "disruption" },
          { createTime: "2026-08-11T11:00:00Z", severity: "available" },
        ],
      },
    ],
  };
  const history = parseXaiComponentHistory(
    `prefix "product":${JSON.stringify(payload)} suffix`,
    new Date("2026-08-11T16:00:00Z"),
  );

  assert.equal(history.uptimePercent, undefined);
  assert.deepEqual(history.days.slice(-2), [
    { date: "2026-08-10", level: "informational" },
    { date: "2026-08-11", level: "degraded" },
  ]);
});
test("keeps unfamiliar xAI history severity unknown", () => {
  const payload = {
    incidents: [
      {
        status: "active",
        startTime: "2026-08-11T10:00:00Z",
        severity: "new-severity",
        updates: [{ createTime: "2026-08-11T10:00:00Z", severity: "new-severity" }],
      },
    ],
  };
  const history = parseXaiComponentHistory(
    `prefix "product":${JSON.stringify(payload)} suffix`,
    new Date("2026-08-11T16:00:00Z"),
  );

  assert.equal(history.days.at(-1)?.level, "unknown");
});
