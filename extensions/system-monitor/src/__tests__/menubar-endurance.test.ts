import { LaunchType } from "@raycast/api";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterAll, describe, expect, it, vi } from "vitest";

import { loadMenuBarSnapshot } from "../menubar/load-snapshot";
import { MAX_MENU_BAR_SNAPSHOT_BYTES, MENU_BAR_SNAPSHOT_CACHE_KEY, SnapshotCache } from "../menubar/snapshot-cache";
import { MenuBarCollectors, PinnedStat } from "../menubar/types";
import { fixtureCollectors } from "./menubar-fixtures";

// Eight-hour logic soak at the production interval:
// SYSTEM_MONITOR_SOAK=1 SYSTEM_MONITOR_SOAK_DURATION_MS=28800000 SYSTEM_MONITOR_SOAK_INTERVAL_MS=10000 npx vitest run src/__tests__/menubar-endurance.test.ts --testTimeout=28830000
const enabled = process.env.SYSTEM_MONITOR_SOAK === "1";
const durationMs = Number(process.env.SYSTEM_MONITOR_SOAK_DURATION_MS ?? 8 * 60 * 60 * 1_000);
const intervalMs = Number(process.env.SYSTEM_MONITOR_SOAK_INTERVAL_MS ?? 10_000);
const supportDirectories: string[] = [];

class MemoryCache implements SnapshotCache {
  readonly store = new Map<string, string>();

  get(key: string) {
    return this.store.get(key);
  }

  set(key: string, value: string) {
    this.store.set(key, value);
  }
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function percentile(values: number[], quantile: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1)] ?? 0;
}

afterAll(async () => {
  await Promise.all(supportDirectories.map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("menu-bar background endurance", () => {
  it.skipIf(!enabled)(
    "runs every pin at the real interval without unsafe collectors, overlap, or cache growth",
    async () => {
      const supportPath = await mkdtemp(path.join(tmpdir(), "system-monitor-soak-"));
      supportDirectories.push(supportPath);
      const cache = new MemoryCache();
      const base = fixtureCollectors();
      let currentPin: PinnedStat = "none";
      let inFlight = 0;
      let maxInFlight = 0;
      const durations: number[] = [];

      const tracked = <T>(collector: () => Promise<T>) =>
        vi.fn(async () => {
          inFlight += 1;
          maxInFlight = Math.max(maxInFlight, inFlight);
          try {
            await wait(25);
            return await collector();
          } finally {
            inFlight -= 1;
          }
        });

      const collectors: MenuBarCollectors = {
        ...base,
        cpu: tracked(base.cpu),
        memory: tracked(base.memory),
        backgroundStorage: tracked(base.backgroundStorage),
        network: vi.fn(async () => {
          throw new Error("background nettop collector must not run");
        }),
        temperature: vi.fn(async () => {
          throw new Error("background temperature-reader collector must not run");
        }),
      };
      const storage = { getItem: async () => currentPin };
      const pins: PinnedStat[] = ["none", "cpu", "memory", "storage", "battery", "network", "temperature"];
      const iterations = Math.max(1, Math.floor(durationMs / intervalMs) + 1);

      for (let index = 0; index < iterations; index += 1) {
        if (index > 0) await wait(intervalMs);
        currentPin = pins[index % pins.length];

        const launches = await Promise.all([
          loadMenuBarSnapshot({
            launchType: LaunchType.Background,
            supportPath,
            storage,
            cache,
            collectors,
          }),
          loadMenuBarSnapshot({
            launchType: LaunchType.Background,
            supportPath,
            storage,
            cache,
            collectors,
          }),
        ]);

        for (const launch of launches) {
          if (launch.collectionState === "collected" && launch.snapshot) {
            durations.push(launch.snapshot.collectionDurationMs);
          }
        }
      }

      const serialized = cache.get(MENU_BAR_SNAPSHOT_CACHE_KEY) ?? "";
      const measurements = {
        durationMs,
        intervalMs,
        launches: iterations * 2,
        maxOverlappingCollectors: maxInFlight,
        nettopCollectorCalls: vi.mocked(collectors.network).mock.calls.length,
        memoryCollectorCalls: vi.mocked(collectors.memory).mock.calls.length,
        temperatureReaderCollectorCalls: vi.mocked(collectors.temperature).mock.calls.length,
        cacheEntryCount: cache.store.size,
        cacheBytes: Buffer.byteLength(serialized, "utf8"),
        collectionDurationMs: {
          p50: percentile(durations, 0.5),
          p95: percentile(durations, 0.95),
          max: Math.max(...durations),
        },
      };

      console.info(`MENUBAR_SOAK_RESULT ${JSON.stringify(measurements)}`);
      expect(measurements.maxOverlappingCollectors).toBe(1);
      expect(measurements.nettopCollectorCalls).toBe(0);
      expect(measurements.memoryCollectorCalls).toBe(0);
      expect(measurements.temperatureReaderCollectorCalls).toBe(0);
      expect(measurements.cacheEntryCount).toBe(1);
      expect(measurements.cacheBytes).toBeLessThanOrEqual(MAX_MENU_BAR_SNAPSHOT_BYTES);
      expect(measurements.collectionDurationMs.max).toBeLessThan(intervalMs);
    },
    durationMs + 30_000,
  );
});
