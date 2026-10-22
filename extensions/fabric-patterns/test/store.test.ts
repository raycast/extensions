import { describe, expect, test } from "bun:test";
import { type KV, orderItems, UsageStore } from "../lib/store";
import { memoryKV } from "./kv";

const items = ["alpha", "bravo", "charlie", "delta", "echo"].map((n) => ({ id: `pattern:${n}`, name: n }));

describe("ISC-10.2: with no query, pinned come first, then by run count", () => {
  test("pinned (in pin order) then count desc then A–Z", () => {
    const { pinned, rest } = orderItems(items, {
      pins: ["pattern:delta", "pattern:bravo"],
      counts: { "pattern:echo": 5, "pattern:alpha": 2, "pattern:bravo": 9, "pattern:charlie": 2 },
    });
    expect(pinned.map((i) => i.name)).toEqual(["delta", "bravo"]);
    expect(rest.map((i) => i.name)).toEqual(["echo", "alpha", "charlie"]);
  });

  test("used = rest with a run count (count order); unused = the A–Z tail", () => {
    const { used, unused } = orderItems(items, {
      pins: ["pattern:delta"],
      counts: { "pattern:echo": 5, "pattern:bravo": 1, "pattern:delta": 9 },
    });
    expect(used.map((i) => i.name)).toEqual(["echo", "bravo"]);
    expect(unused.map((i) => i.name)).toEqual(["alpha", "charlie"]);
  });

  test("a pin for an item that no longer exists is skipped, not rendered", () => {
    const { pinned } = orderItems(items, { pins: ["pattern:gone", "pattern:alpha"], counts: {} });
    expect(pinned.map((i) => i.name)).toEqual(["alpha"]);
  });

  test("with no usage the order is A–Z", () => {
    const { pinned, rest } = orderItems([...items].reverse(), { pins: [], counts: {} });
    expect(pinned).toEqual([]);
    expect(rest.map((i) => i.name)).toEqual(["alpha", "bravo", "charlie", "delta", "echo"]);
  });
});

describe("ISC-12: pins and run counts persist through the store", () => {
  test("a fresh store over the same storage sees earlier pins and counts", async () => {
    const kv = memoryKV();
    const a = new UsageStore(kv);
    await a.load();
    await a.togglePin("pattern:alpha");
    await a.recordRun("pattern:bravo");
    await a.recordRun("pattern:bravo");

    const b = new UsageStore(kv);
    const usage = await b.load();
    expect(usage.pins).toEqual(["pattern:alpha"]);
    expect(usage.counts["pattern:bravo"]).toBe(2);
  });

  test("a rename moves the pin in place and carries the run count", async () => {
    const s = new UsageStore(memoryKV());
    await s.load();
    await s.togglePin("pattern:a");
    await s.togglePin("pattern:old");
    await s.togglePin("pattern:z");
    await s.recordRun("pattern:old");
    const u = await s.rename("pattern:old", "pattern:new");
    expect(u.pins).toEqual(["pattern:a", "pattern:new", "pattern:z"]);
    expect(u.counts).toEqual({ "pattern:new": 1 });
  });

  test("two stores over the same storage never undo each other", async () => {
    const kv = memoryKV();
    const browse = new UsageStore(kv);
    const editor = new UsageStore(kv);
    await browse.load();
    await browse.togglePin("pattern:old");
    await editor.rename("pattern:old", "pattern:new");
    // Browse never reloaded; its next write must not bring the old pin back.
    const u = await browse.togglePin("pattern:other");
    expect(u.pins).toEqual(["pattern:new", "pattern:other"]);
  });

  test("forgetting a deleted item drops its pin and count, and nothing else", async () => {
    const s = new UsageStore(memoryKV());
    await s.load();
    await s.togglePin("pattern:keep");
    await s.togglePin("pattern:gone");
    await s.recordRun("pattern:gone");
    await s.recordRun("pattern:keep");
    const u = await s.forget("pattern:gone");
    expect(u).toEqual({ pins: ["pattern:keep"], counts: { "pattern:keep": 1 } });
  });

  test("overlapping changes, even from different stores, never drop one another", async () => {
    const kv = memoryKV();
    const slow: KV = {
      get: async (k) => (await Bun.sleep(5), kv.get(k)),
      set: async (k, v) => (await Bun.sleep(5), kv.set(k, v)),
    };
    const a = new UsageStore(slow);
    const b = new UsageStore(slow);
    await Promise.all([
      a.togglePin("pattern:a"),
      b.togglePin("pattern:b"),
      a.recordRun("pattern:c"),
      a.togglePin("pattern:c"),
    ]);
    const u = await a.load();
    expect(u.pins).toEqual(["pattern:a", "pattern:b", "pattern:c"]);
    expect(u.counts).toEqual({ "pattern:c": 1 });
    await Promise.all([a.togglePin("pattern:x"), a.togglePin("pattern:x")]);
    expect((await a.load()).pins).not.toContain("pattern:x");
  });

  test("saving an item under its own name keeps its pin and count (every edit-save calls rename)", async () => {
    const s = new UsageStore(memoryKV());
    await s.togglePin("context:notes");
    await s.recordRun("context:notes");
    // revert the from === to guard in rename() and this fails
    expect(await s.rename("context:notes", "context:notes")).toEqual({
      pins: ["context:notes"],
      counts: { "context:notes": 1 },
    });
  });

  test("renaming onto a stale id keeps one pin and sums the counts", async () => {
    const s = new UsageStore(memoryKV());
    await s.togglePin("pattern:old");
    await s.togglePin("pattern:new");
    await s.recordRun("pattern:old");
    await s.recordRun("pattern:new");
    expect(await s.rename("pattern:old", "pattern:new")).toEqual({
      pins: ["pattern:new"],
      counts: { "pattern:new": 2 },
    });
  });

  test("toggling twice unpins", async () => {
    const s = new UsageStore(memoryKV());
    await s.load();
    await s.togglePin("pattern:x");
    const u = await s.togglePin("pattern:x");
    expect(u.pins).toEqual([]);
  });

  test("everything is stored as one JSON string", async () => {
    const kv = memoryKV();
    const s = new UsageStore(kv);
    await s.load();
    await s.recordRun("pattern:x");
    expect(kv.data.size).toBe(1);
    expect(typeof [...kv.data.values()][0]).toBe("string");
  });

  test("corrupt stored JSON starts empty instead of throwing", async () => {
    const kv = memoryKV();
    kv.data.set("usage.v1", "{not json");
    expect(await new UsageStore(kv).load()).toEqual({ pins: [], counts: {} });
  });
});
