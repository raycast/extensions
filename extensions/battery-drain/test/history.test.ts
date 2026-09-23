import { describe, expect, it } from "vitest";
import {
  appendSample,
  combineHistory,
  HISTORY_KEY,
  KeyValueStorage,
  loadHistory,
  MAX_AGE_MS,
  MAX_SAMPLES,
  prune,
  toSample,
} from "../src/history/store";
import { Sample, Snapshot } from "../src/types";

function memoryStorage(initial?: string): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(HISTORY_KEY, initial);
  return {
    data,
    getItem: async (k) => data.get(k),
    setItem: async (k, v) => {
      data.set(k, v);
    },
  };
}

const sample = (t: number, extra: Partial<Sample> = {}): Sample => ({ t, procs: [], ...extra });

describe("toSample", () => {
  it("records when each process started, so a reused pid is not mistaken for it later", () => {
    const snap: Snapshot = {
      t: 10 * 60_000,
      battery: {},
      processes: [{ pid: 42, command: "yes", energy: 99, cpu: 99 }],
      processInfo: new Map([
        [42, { etimeSec: 120, cpuTimeSec: 118, user: "me", ppid: 1, command: "yes", path: "/usr/bin/yes" }],
      ]),
      blockers: [],
      errors: [],
    };
    expect(toSample(snap).procs[0].start).toBe(8 * 60_000);
  });

  it("keeps the ten most energetic processes", () => {
    const processes = Array.from({ length: 15 }, (_, i) => ({ pid: i + 1, command: `p${i}`, energy: i, cpu: i }));
    const snap: Snapshot = {
      t: 5,
      battery: { systemLoadW: 12.3, percent: 50 },
      source: { source: "battery" },
      processes,
      processInfo: new Map(),
      blockers: [],
      errors: [],
    };
    const s = toSample(snap);
    expect(s).toMatchObject({ t: 5, systemW: 12.3, percent: 50, onAC: false });
    expect(toSample({ ...snap, battery: { ...snap.battery, updatedAt: 4 } }).wAt).toBe(4);
    expect(s.procs).toHaveLength(10);
    expect(s.procs[0]).toEqual({ pid: 15, cmd: "p14", cpu: 14, energy: 14 });
  });
});

describe("prune", () => {
  it("drops samples older than two hours and caps the count", () => {
    const now = 10 * MAX_AGE_MS;
    const old = sample(now - MAX_AGE_MS - 1);
    const fresh = Array.from({ length: MAX_SAMPLES + 5 }, (_, i) => sample(now - i));
    const kept = prune([old, ...fresh], now);
    expect(kept).toHaveLength(MAX_SAMPLES);
    expect(kept.some((s) => s.t === old.t)).toBe(false);
    expect(kept[kept.length - 1].t).toBe(now); // oldest first, newest last
  });
});

describe("loadHistory / appendSample", () => {
  it("keeps both samples when another run writes in between (the menu opened while the timer ran)", async () => {
    const storage = memoryStorage();
    let raced = false;
    const racy: KeyValueStorage = {
      getItem: storage.getItem,
      setItem: async (k, v) => {
        await storage.setItem(k, v);
        // Right after our write, the other run writes the history it read before ours: ours is lost.
        if (!raced) {
          raced = true;
          await storage.setItem(k, JSON.stringify([sample(1500)]));
        }
      },
    };
    const history = await appendSample(racy, sample(2000));
    expect(history.map((s) => s.t)).toEqual([1500, 2000]);
    expect(JSON.parse(storage.data.get(HISTORY_KEY)!).map((s: Sample) => s.t)).toEqual([1500, 2000]);
  });

  it("round-trips through storage", async () => {
    const storage = memoryStorage();
    await appendSample(storage, sample(1000));
    const history = await appendSample(storage, sample(2000));
    expect(history.map((s) => s.t)).toEqual([1000, 2000]);
    expect(await loadHistory(storage, 2000)).toEqual(history);
  });

  it("resets on corrupt JSON", async () => {
    expect(await loadHistory(memoryStorage("{not json"), 0)).toEqual([]);
  });

  it("resets on a foreign shape", async () => {
    expect(await loadHistory(memoryStorage(JSON.stringify({ hello: "world" })), 0)).toEqual([]);
    expect(await loadHistory(memoryStorage(JSON.stringify([{ nope: 1 }])), 0)).toEqual([]);
  });

  it("clears an impossible wattage already stored, so one bad reading cannot skew two hours of charts", async () => {
    const stored = [
      { t: 90, systemW: 18446744073709524, procs: [] },
      { t: 95, systemW: 0, procs: [] }, // stored the moment the charger was unplugged
      { t: 100, systemW: 15, procs: [] },
    ];
    const history = await loadHistory(memoryStorage(JSON.stringify(stored)), 100);
    expect(history.map((s) => s.systemW)).toEqual([undefined, undefined, 15]);
  });

  it("drops samples whose procs or numbers have the wrong shape", async () => {
    const good = { t: 100, systemW: 5, percent: 50, onAC: false, procs: [{ pid: 1, cmd: "a", cpu: 1, energy: 1 }] };
    const stored = [
      { t: 10, procs: [null] },
      { t: 20, procs: [{ pid: 1, cmd: "a", energy: 1 }] }, // missing cpu would read as "hot"
      { t: 30, systemW: "12", procs: [] },
      { t: 40, onAC: "yes", procs: [] },
      good,
    ];
    expect(await loadHistory(memoryStorage(JSON.stringify(stored)), 100)).toEqual([good]);
  });
});

describe("combineHistory", () => {
  it("adds Diagnose's own process samples to the stored history, so runaways are caught with the menu bar off", () => {
    const stored = [sample(1000), sample(3000)];
    const local = [sample(2000), sample(3000), sample(4000)];
    expect(combineHistory(stored, local, 4000).map((s) => s.t)).toEqual([1000, 2000, 3000, 4000]);
  });

  it("drops samples older than the history keeps", () => {
    const now = 3 * 60 * 60 * 1000;
    expect(combineHistory([sample(0)], [sample(now)], now).map((s) => s.t)).toEqual([now]);
  });
});
