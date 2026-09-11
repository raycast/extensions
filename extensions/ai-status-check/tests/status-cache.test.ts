import assert from "node:assert/strict";
import test from "node:test";
import { SnapshotCache } from "../src/services/status-cache";
import type { ProviderSnapshot } from "../src/domain/types";

const snapshot: ProviderSnapshot = {
  providerId: "example",
  health: "operational",
  fetchedAt: "2026-09-10T16:00:00Z",
  components: [],
  incidents: [],
};

test("cache rejects malformed nested snapshots and accepts older valid snapshots", () => {
  for (const invalid of [
    { ...snapshot, incidents: [null] },
    { ...snapshot, health: "future-health" },
    { ...snapshot, fetchedAt: "not a date" },
    { ...snapshot, components: [{ id: "api", name: "API", health: "operational", history: { days: [null] } }] },
    {
      ...snapshot,
      incidents: [
        {
          id: "i",
          title: "Incident",
          state: "resolved",
          health: "operational",
          affectedComponentIds: [],
          updates: [null],
        },
      ],
    },
    { ...snapshot, providerId: "foreign" },
  ]) {
    const cache = new SnapshotCache({ get: () => JSON.stringify(invalid), set: () => {} });
    assert.equal(cache.getSnapshot("example"), undefined);
  }
  const cache = new SnapshotCache({ get: () => JSON.stringify(snapshot), set: () => {} });
  assert.deepEqual(cache.getSnapshot("example"), snapshot);
});

test("cache round-trips valid history and prevents invalid writes", () => {
  const storage = new Map<string, string>();
  const cache = new SnapshotCache({
    get: (key) => storage.get(key),
    set: (key, value) => {
      storage.set(key, value);
    },
  });
  const complete: ProviderSnapshot = {
    ...snapshot,
    incidentHistoryAvailability: "available",
    components: [
      {
        id: "api",
        name: "API",
        health: "operational",
        historyAvailability: "available",
        history: {
          basis: "availability",
          windowDays: 2,
          periodDays: 1,
          days: [
            { date: "2026-09-09", level: "operational" },
            { date: "2026-09-10", level: "affected" },
          ],
          uptimePercent: 99.9,
          uptimeText: "99.90%",
        },
      },
    ],
  };
  cache.setSnapshot(complete);
  assert.deepEqual(cache.getSnapshot("example"), complete);
  const inconsistent = structuredClone(complete);
  inconsistent.components[0]!.history!.uptimeText = "99.70%";
  assert.throws(() => cache.setSnapshot(inconsistent), /Published uptime text/);
  const malformed = structuredClone(complete);
  malformed.components[0]!.history!.days[0]!.date = "2026-02-30";
  assert.throws(() => cache.setSnapshot(malformed), /Invalid history date/);
  assert.deepEqual(cache.getSnapshot("example"), complete);
});
