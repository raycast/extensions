import assert from "node:assert/strict";
import test from "node:test";
import { parseBetterStack } from "../src/providers/adapters/betterstack";
import { jsonFixture } from "./support/fixtures";

test("normalizes Better Stack sections, resources, incidents, and updates", async () => {
  const parsed = parseBetterStack(await jsonFixture("betterstack/index-degraded.json"));

  assert.equal(parsed.reportedHealth, "degraded");
  assert.equal(parsed.statusText, "degraded");
  assert.deepEqual(parsed.components[0], {
    id: "api",
    name: "Inference API",
    health: "degraded",
    statusText: "degraded",
    group: "Inference",
    historyAvailability: "available",
    history: {
      basis: "availability",
      windowDays: 3,
      days: [
        { date: "2026-08-09", level: "not_monitored" },
        { date: "2026-08-10", level: "major_outage" },
        { date: "2026-08-11", level: "operational" },
      ],
      uptimePercent: 99.5,
      uptimeText: "99.500%",
      monitoredSince: "2026-08-10",
    },
  });
  assert.equal(parsed.incidents[0]?.state, "investigating");
  assert.equal(parsed.incidents[0]?.stateText, "degraded");
  assert.equal(parsed.incidents[0]?.updates[0]?.body, "We are investigating elevated latency.");
  assert.equal(parsed.incidents[0]?.updates[0]?.stateText, "investigating");
  assert.throws(() => parseBetterStack({}), /Better Stack status page data/);
});
