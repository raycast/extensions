import test from "node:test";
import assert from "node:assert/strict";

test("parseCursorUsage uses enterprise overall when plan is absent", async () => {
  const { parseCursorUsage } = await import("./parser");

  const usage = parseCursorUsage(
    {
      billingCycleEnd: "2026-05-01T00:00:00.000Z",
      membershipType: "enterprise",
      individualUsage: { overall: { used: 7384, limit: 10000 } },
      teamUsage: { pooled: { used: 12_725_135, limit: 28_122_000 } },
    },
    { email: "user@example.com", sub: "auth0|user" },
    null,
    "test",
  );

  assert.equal(usage.account, "user@example.com");
  assert.ok(Math.abs(usage.total.usedPercent - 73.84) < 0.0001);
  assert.equal(usage.planUsedUsd, 73.84);
  assert.equal(usage.planLimitUsd, 100);
});

test("parseCursorUsage uses legacy requests as the primary quota and hides Auto/API", async () => {
  const { parseCursorUsage } = await import("./parser");

  const usage = parseCursorUsage(
    {
      membershipType: "enterprise",
      individualUsage: {
        plan: { used: 700, limit: 10000, autoPercentUsed: 11, apiPercentUsed: 22 },
      },
    },
    null,
    { "gpt-4": { numRequests: 200, numRequestsTotal: 240, maxRequestUsage: 500 } },
    "test",
  );

  assert.equal(usage.total.usedPercent, 48);
  assert.deepEqual(usage.legacyRequests, { used: 240, limit: 500, usedPercent: 48 });
  assert.equal(usage.auto, null);
  assert.equal(usage.api, null);
});

test("parseCursorUsage prefers raw plan total over averaging split percentages", async () => {
  const { parseCursorUsage } = await import("./parser");

  const usage = parseCursorUsage(
    {
      membershipType: "pro",
      individualUsage: {
        plan: { used: 1800, limit: 10000, autoPercentUsed: 10, apiPercentUsed: 50 },
      },
    },
    null,
    null,
    "test",
  );

  assert.equal(usage.total.usedPercent, 18);
  assert.equal(usage.auto?.usedPercent, 10);
  assert.equal(usage.api?.usedPercent, 50);
});

test("parseCursorUsage surfaces team on-demand pool and personal rider", async () => {
  const { parseCursorUsage } = await import("./parser");

  const usage = parseCursorUsage(
    {
      membershipType: "enterprise",
      individualUsage: { onDemand: { used: 4471, limit: null } },
      teamUsage: { onDemand: { used: 1_311_125, limit: 2_000_000 } },
    },
    null,
    null,
    "test",
  );

  assert.equal(usage.onDemand?.usedUsd, 13111.25);
  assert.equal(usage.onDemand?.limitUsd, 20000);
  assert.equal(usage.onDemand?.personalUsedUsd, 44.71);
});
