import { describe, expect, it } from "vitest";
import { getSharedScan, SHARED_SCAN_MEMO_MS, sharedScanKey } from "../src/helpers/shared-scan";
import type { KeyValueStore } from "../src/helpers/work-item-backends";

const SCOPE = { basePath: "https://plane.example.com/api", workspaceSlug: "ws", account: "acct" };
let keyCounter = 0;

/** A fresh key per test, since scans in flight are tracked per key for the whole module. */
function uniqueKey() {
  keyCounter += 1;
  return `${sharedScanKey(SCOPE)}#${keyCounter}`;
}

function memoryStore(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    get: (key) => map.get(key),
    set: (key, value) => void map.set(key, value),
    remove: (key) => void map.delete(key),
  };
}

function fakeClock(start: number, onSleep: (now: number) => void = () => undefined) {
  let current = start;
  return {
    now: () => current,
    advance: (ms: number) => void (current += ms),
    sleep: async (ms: number) => {
      current += ms;
      onSleep(current);
    },
  };
}

describe("getSharedScan", () => {
  it("keys the scan by server, workspace and account, not by view", () => {
    expect(sharedScanKey(SCOPE)).toBe("https://plane.example.com/api|ws|acct|scan");
    expect(sharedScanKey({ ...SCOPE, account: "other" })).not.toBe(sharedScanKey(SCOPE));
  });

  it("serves Assigned and Created from one scan, and rescans when a view refreshes", async () => {
    const store = memoryStore();
    const key = uniqueKey();
    const clock = fakeClock(1000);
    let scans = 0;
    const run = async () => `scan ${++scans}`;

    expect(await getSharedScan({ store, key, view: "assigned", run, ...clock })).toBe("scan 1");
    clock.advance(5000);
    expect(await getSharedScan({ store, key, view: "created", run, ...clock })).toBe("scan 1");
    expect(scans).toBe(1);

    // Assigned already used scan 1, so asking again is a refresh.
    expect(await getSharedScan({ store, key, view: "assigned", run, ...clock })).toBe("scan 2");
    expect(scans).toBe(2);
  });

  it("rescans for a new view once the shared scan is older than the memo window", async () => {
    const store = memoryStore();
    const key = uniqueKey();
    const clock = fakeClock(1000);
    let scans = 0;
    const run = async () => `scan ${++scans}`;

    await getSharedScan({ store, key, view: "assigned", run, ...clock });
    clock.advance(SHARED_SCAN_MEMO_MS);
    expect(await getSharedScan({ store, key, view: "created", run, ...clock })).toBe("scan 2");
  });

  it("shares one scan between views loading at the same time in one process", async () => {
    const store = memoryStore();
    const key = uniqueKey();
    let scans = 0;
    let finish: () => void = () => undefined;
    const run = () =>
      new Promise<string>((resolve) => {
        scans += 1;
        finish = () => resolve("shared");
      });

    const assigned = getSharedScan({ store, key, view: "assigned", run });
    const created = getSharedScan({ store, key, view: "created", run });
    finish();
    expect(await Promise.all([assigned, created])).toEqual(["shared", "shared"]);
    expect(scans).toBe(1);
  });

  it("makes Created wait for another process's Assigned scan of the same scope", async () => {
    const store = memoryStore();
    const key = uniqueKey();
    // The menu bar started scanning at 1000 and stores its result at 4000.
    store.set(`${key}|lease`, JSON.stringify({ startedAt: 1000 }));
    const clock = fakeClock(1500, (now) => {
      if (now >= 4000 && !store.map.has(key)) {
        store.set(key, JSON.stringify({ value: "menu bar scan", fetchedAt: 4000, served: ["assigned"] }));
        store.remove(`${key}|lease`);
      }
    });
    let ran = false;
    const value = await getSharedScan({
      store,
      key,
      view: "created",
      run: async () => {
        ran = true;
        return "second scan";
      },
      ...clock,
    });
    expect(value).toBe("menu bar scan");
    expect(ran).toBe(false);
  });

  it("holds the scope's lease while scanning and stores the result for other views", async () => {
    const store = memoryStore();
    const key = uniqueKey();
    let leaseDuringRun: string | undefined;
    await getSharedScan({
      store,
      key,
      view: "assigned",
      run: async () => {
        leaseDuringRun = store.get(`${key}|lease`);
        return "scanned";
      },
      now: () => 1000,
    });
    expect(JSON.parse(leaseDuringRun!)).toEqual({ startedAt: 1000 });
    expect(store.map.has(`${key}|lease`)).toBe(false);
    expect(JSON.parse(store.get(key)!)).toEqual({ value: "scanned", fetchedAt: 1000, served: ["assigned"] });
  });

  it("doesn't share a scan that may have crossed a workspace switch", async () => {
    const store = memoryStore();
    const key = uniqueKey();
    await getSharedScan({ store, key, view: "assigned", run: async () => "scanned", canStore: () => false });
    expect(store.map.has(key)).toBe(false);
  });
});
