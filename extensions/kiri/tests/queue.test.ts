import { describe, expect, it } from "vitest";
import { ApiError } from "../src/lib/api";
import {
  addHistory,
  buildSessionBody,
  enqueue,
  flushQueue,
  groupByDay,
  type HistoryEntry,
  markHistory,
  MAX_ATTEMPTS,
  parseHistory,
  parseQueue,
} from "../src/lib/queue";

const entry = (id: string, endedAt: number, minutes = 25, task = ""): HistoryEntry => ({
  id,
  task,
  minutes,
  startedAt: endedAt - minutes * 60_000,
  endedAt,
  sound: "rain",
  kiri: "queued",
});

const T0 = new Date(2026, 10, 23, 15, 0, 0).getTime();

describe("blocks for Kiri", () => {
  it("builds the device API body", () => {
    expect(buildSessionBody(entry("0b0f3c1e-2d4a-4b8e-9f10-1a2b3c4d5e6f", T0, 25, "Write"))).toEqual({
      client_block_id: "0b0f3c1e-2d4a-4b8e-9f10-1a2b3c4d5e6f",
      started_at: new Date(T0 - 25 * 60_000).toISOString(),
      duration_seconds: 1500,
      ambient: "rain",
      binaural: "",
      intent: "Write",
    });
  });

  it("queues a block once", () => {
    const body = buildSessionBody(entry("a", T0));
    const q = enqueue(enqueue([], body, "c1"), body, "c1");
    expect(q).toHaveLength(1);
  });

  it("sends in order and stops when offline, without counting it as a failure", async () => {
    const q = enqueue(enqueue([], buildSessionBody(entry("a", T0)), "c1"), buildSessionBody(entry("b", T0)), "c1");
    const r = await flushQueue(q, async (b) => {
      if (b.client_block_id === "b") throw new ApiError(0, "network", "offline");
      return 1;
    });
    expect(r.sentIds).toEqual(["a"]);
    expect(r.kirisEarned).toBe(1);
    expect(r.remaining.map((x) => x.body.client_block_id)).toEqual(["b"]);
    expect(r.remaining[0].attempts).toBe(0);
  });

  it("drops a block Kiri rejects for good and goes on", async () => {
    const q = enqueue(enqueue([], buildSessionBody(entry("old", T0)), "c1"), buildSessionBody(entry("new", T0)), "c1");
    const r = await flushQueue(q, async (b) => {
      if (b.client_block_id === "old") throw new ApiError(400, "invalid_started_at", "too old");
      return 0.4;
    });
    expect(r.dropped).toBe(1);
    expect(r.sentIds).toEqual(["new"]);
    expect(r.remaining).toEqual([]);
  });

  it("counts server errors and drops a block after too many", async () => {
    const [item] = enqueue([], buildSessionBody(entry("a", T0)), "c1");
    const fail = async () => {
      throw new ApiError(500, "server_error", "x");
    };
    const r1 = await flushQueue([item], fail);
    expect(r1.remaining[0].attempts).toBe(1);
    const r2 = await flushQueue([{ ...item, attempts: MAX_ATTEMPTS - 1 }], fail);
    expect(r2.remaining).toEqual([]);
    expect(r2.dropped).toBe(1);
  });

  it("stops at a 401 and reports it", async () => {
    const q = enqueue([], buildSessionBody(entry("a", T0)), "c1");
    const r = await flushQueue(q, async () => {
      throw new ApiError(401, "invalid_token", "x");
    });
    expect(r.unauthorized).toBe(true);
    expect(r.remaining).toHaveLength(1);
  });

  it("reads stored queues and history defensively", () => {
    const q = enqueue([], buildSessionBody(entry("a", T0)), "c1");
    expect(parseQueue(JSON.parse(JSON.stringify(q)))).toEqual(q);
    expect(parseQueue([{ body: { client_block_id: "x" } }, null, 3, { body: q[0].body }])).toEqual([]);
    const h = [entry("a", T0)];
    expect(parseHistory(JSON.parse(JSON.stringify(h)))).toEqual(h);
    expect(parseHistory([{ id: 1 }, "x"])).toEqual([]);
  });
});

describe("history", () => {
  it("adds newest first, once, and marks saved blocks", () => {
    let h = addHistory([], entry("a", T0));
    h = addHistory(h, entry("b", T0 + 1));
    h = addHistory(h, entry("a", T0));
    expect(h.map((x) => x.id)).toEqual(["b", "a"]);
    h = markHistory(h, ["a"], "saved");
    expect(h.find((x) => x.id === "a")?.kiri).toBe("saved");
    expect(h.find((x) => x.id === "b")?.kiri).toBe("queued");
  });

  it("groups by local day with totals", () => {
    const day = 24 * 60 * 60_000;
    const groups = groupByDay([entry("a", T0 - day, 50), entry("b", T0, 25), entry("c", T0 + 60_000, 90)]);
    expect(groups).toHaveLength(2);
    expect(groups[0].entries.map((e) => e.id)).toEqual(["c", "b"]);
    expect(groups[0].minutes).toBe(115);
    expect(groups[1].minutes).toBe(50);
  });
});
