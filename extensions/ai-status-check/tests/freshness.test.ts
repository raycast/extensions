import assert from "node:assert/strict";
import test from "node:test";
import { FRESH_TTL_MS, STALE_TTL_MS, getDataFreshness } from "../src/domain/freshness";
import type { ProviderSnapshot } from "../src/domain/types";

const now = Date.parse("2026-08-11T16:00:00Z");

test("classifies missing, fresh, stale, and expired snapshots", () => {
  assert.equal(getDataFreshness(undefined, now), "unavailable");
  assert.equal(getDataFreshness(snapshotAt(now - FRESH_TTL_MS), now), "fresh");
  assert.equal(getDataFreshness(snapshotAt(now - FRESH_TTL_MS - 1), now), "stale");
  assert.equal(getDataFreshness(snapshotAt(now - STALE_TTL_MS), now), "stale");
  assert.equal(getDataFreshness(snapshotAt(now - STALE_TTL_MS - 1), now), "expired");
});

test("treats an invalid cache timestamp as expired", () => {
  assert.equal(getDataFreshness({ ...snapshotAt(now), fetchedAt: "not-a-date" }, now), "expired");
});

function snapshotAt(timestamp: number): ProviderSnapshot {
  return {
    providerId: "example",
    health: "operational",
    components: [],
    incidents: [],
    fetchedAt: new Date(timestamp).toISOString(),
  };
}
