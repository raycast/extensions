import { describe, expect, it } from "vitest";
import { SCAN_LEASE_MS, withScanLease } from "../src/helpers/scan-lease";
import type { KeyValueStore } from "../src/helpers/work-item-backends";

const KEY = "lease";

function memoryStore(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    get: (key) => map.get(key),
    set: (key, value) => void map.set(key, value),
    remove: (key) => void map.delete(key),
  };
}

/** A fake clock whose sleep advances time and runs a hook, standing in for the other process. */
function fakeClock(start: number, onSleep: (now: number) => void = () => undefined) {
  let current = start;
  return {
    now: () => current,
    sleep: async (ms: number) => {
      current += ms;
      onSleep(current);
    },
  };
}

describe("withScanLease", () => {
  it("scans, holds the lease while scanning, and clears it afterwards", async () => {
    const store = memoryStore();
    const clock = fakeClock(1000);
    let leaseDuringRun: string | undefined;
    const value = await withScanLease({
      store,
      leaseKey: KEY,
      readResult: () => undefined,
      run: async () => {
        leaseDuringRun = store.get(KEY);
        return "scanned";
      },
      ...clock,
    });
    expect(value).toBe("scanned");
    expect(JSON.parse(leaseDuringRun!)).toEqual({ startedAt: 1000 });
    expect(store.map.has(KEY)).toBe(false);
  });

  it("waits for another process's result instead of scanning", async () => {
    const store = memoryStore();
    store.set(KEY, JSON.stringify({ startedAt: 1000 }));
    let shared: { value: string; fetchedAt: number } | undefined;
    // The other process finishes 3 seconds later.
    const clock = fakeClock(1500, (now) => {
      if (now >= 4000) shared = { value: "from other process", fetchedAt: 4000 };
    });
    let ran = false;
    const value = await withScanLease({
      store,
      leaseKey: KEY,
      readResult: () => shared,
      run: async () => {
        ran = true;
        return "scanned";
      },
      ...clock,
    });
    expect(value).toBe("from other process");
    expect(ran).toBe(false);
  });

  it("ignores a result older than the other process's lease", async () => {
    const store = memoryStore();
    store.set(KEY, JSON.stringify({ startedAt: 1000 }));
    const clock = fakeClock(1500, (now) => {
      if (now >= 3000) store.remove(KEY); // the other scan failed
    });
    const value = await withScanLease({
      store,
      leaseKey: KEY,
      readResult: () => ({ value: "stale", fetchedAt: 500 }),
      run: async () => "scanned",
      ...clock,
    });
    expect(value).toBe("scanned");
  });

  it("scans when the lease is stale", async () => {
    const store = memoryStore();
    store.set(KEY, JSON.stringify({ startedAt: 1000 }));
    const clock = fakeClock(1000 + SCAN_LEASE_MS + 1);
    const value = await withScanLease({
      store,
      leaseKey: KEY,
      readResult: () => undefined,
      run: async () => "scanned",
      ...clock,
    });
    expect(value).toBe("scanned");
  });

  it("scans after waiting out a live lease that never produces a result", async () => {
    const store = memoryStore();
    store.set(KEY, JSON.stringify({ startedAt: 1000 }));
    const clock = fakeClock(1000);
    const value = await withScanLease({
      store,
      leaseKey: KEY,
      readResult: () => undefined,
      run: async () => "scanned",
      ...clock,
    });
    expect(value).toBe("scanned");
    expect(clock.now()).toBeGreaterThanOrEqual(1000 + SCAN_LEASE_MS);
  });

  it("clears the lease when the scan fails, and doesn't clear a newer lease", async () => {
    const store = memoryStore();
    const clock = fakeClock(1000);
    await expect(
      withScanLease({
        store,
        leaseKey: KEY,
        readResult: () => undefined,
        run: async () => {
          throw new Error("429");
        },
        ...clock,
      }),
    ).rejects.toThrow("429");
    expect(store.map.has(KEY)).toBe(false);

    await withScanLease({
      store,
      leaseKey: KEY,
      readResult: () => undefined,
      run: async () => {
        store.set(KEY, JSON.stringify({ startedAt: 999999 })); // another process took over
        return "scanned";
      },
      ...clock,
    });
    expect(JSON.parse(store.get(KEY)!)).toEqual({ startedAt: 999999 });
  });
});
