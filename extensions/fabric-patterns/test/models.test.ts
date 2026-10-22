import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { groupByVendor, ModelStore, pairKey, parseModels, parsePairKey } from "../lib/models";
import { type KV, UsageStore } from "../lib/store";
import { memoryKV } from "./kv";

// `-L` as real fabric 1.4.518 prints it: flat `[N]\tVendor|model` rows.
const table = readFileSync(join(import.meta.dir, "fixtures", "models.txt"), "utf8");
/** Every `Vendor|model` the fixture names, read independently of parseModels. */
const fixturePairs = table
  .split("\n")
  .filter((l) => /\t\[\d+\]\t/.test(l))
  .map((l) => l.split("\t").at(-1)!.trim());

describe("ISC-61: models come from -L, grouped by the Vendor| prefix", () => {
  const rows = parseModels(table);

  test("every -L row parses, in order, to its vendor and model", () => {
    expect(fixturePairs.length).toBe(48);
    expect(rows.map(pairKey)).toEqual(fixturePairs);
  });

  test("the starred row is fabric's default, and only that one", () => {
    expect(rows.filter((r) => r.isDefault).map(pairKey)).toEqual(["Anthropic|claude-sonnet-4-5-20250929"]);
  });

  test("groups follow the prefix, in -L's order: Anthropic 14, ClaudeCode 14, Ollama 7, OpenAI 13", () => {
    const groups = groupByVendor(rows);
    expect(groups.map(([v, rs]) => [v, rs.length])).toEqual([
      ["Anthropic", 14],
      ["ClaudeCode", 14],
      ["Ollama", 7],
      ["OpenAI", 13],
    ]);
    for (const [v, rs] of groups) expect(rs.every((r) => r.vendor === v)).toBe(true);
  });

  test("headers, blank lines and junk are not rows", () => {
    expect(parseModels("Available models:\n\nNo models\n")).toEqual([]);
  });

  test("trailing spaces and a CR are not part of the model name", () => {
    expect(parseModels("       \t[1]\tOllama|m  \r\n").map(pairKey)).toEqual(["Ollama|m"]);
  });

  test("groups keep -L's vendor order, even when it isn't A–Z", () => {
    const rows = parseModels("\t[1]\tOpenAI|a\n\t[2]\tAnthropic|b\n\t[3]\tOpenAI|c\n");
    expect(groupByVendor(rows).map(([v, rs]) => [v, rs.map((r) => r.model)])).toEqual([
      ["OpenAI", ["a", "c"]],
      ["Anthropic", ["b"]],
    ]);
  });

  test("a vendor with a space and a model with a slash parse whole", () => {
    expect(parseModels("       \t[1]\tLM Studio|openai/gpt-oss-20b\n").map(pairKey)).toEqual([
      "LM Studio|openai/gpt-oss-20b",
    ]);
  });
});

describe("ISC-61.1: a model and its vendor are one pair", () => {
  test("the same model under two vendors is two distinct keys", () => {
    const both = parseModels(table).filter((r) => r.model === "claude-haiku-4-5");
    expect(both.map((r) => r.vendor)).toEqual(["Anthropic", "ClaudeCode"]);
    expect(new Set(both.map(pairKey)).size).toBe(2);
  });

  test("a key reads back to the pair; the model may hold a |", () => {
    expect(parsePairKey("ClaudeCode|claude-haiku-4-5")).toEqual({ vendor: "ClaudeCode", model: "claude-haiku-4-5" });
    expect(parsePairKey("Ollama|a|b")).toEqual({ vendor: "Ollama", model: "a|b" });
    expect(parsePairKey("")).toBeUndefined();
    expect(parsePairKey("nobar")).toBeUndefined();
  });

  test("a pin keeps the vendor it was made with", async () => {
    const kv = memoryKV();
    await new ModelStore(kv).pin("summarize", { vendor: "ClaudeCode", model: "claude-haiku-4-5" });
    expect((await new ModelStore(kv).load()).summarize).toEqual({ vendor: "ClaudeCode", model: "claude-haiku-4-5" });
  });
});

describe("ISC-60: a model pin persists, follows a rename and is forgotten", () => {
  const pair = { vendor: "Anthropic", model: "claude-opus-4-5" };

  test("survives a reload (a new store over the same storage)", async () => {
    const kv = memoryKV();
    await new ModelStore(kv).pin("summarize", pair);
    expect(await new ModelStore(kv).load()).toEqual({ summarize: pair });
  });

  test("ISC-60.1: rename moves it", async () => {
    const kv = memoryKV();
    const s = new ModelStore(kv);
    await s.pin("a", pair);
    await s.rename("a", "b");
    expect(await s.load()).toEqual({ b: pair });
  });

  test("ISC-60.1: rename onto a pattern with its own pin keeps the target's", async () => {
    const kv = memoryKV();
    const s = new ModelStore(kv);
    const other = { vendor: "Ollama", model: "llama3.2:1b" };
    await s.pin("a", pair);
    await s.pin("b", other);
    await s.rename("a", "b");
    expect(await s.load()).toEqual({ b: other });
  });

  test("pin, unpin and rename hand back records a pattern named constructor can't read through", async () => {
    const s = new ModelStore(memoryKV());
    for (const pins of [await s.pin("a", pair), await s.rename("a", "b"), await s.unpin("b")])
      expect(Object.hasOwn(pins, "constructor") || pins.constructor === undefined).toBe(true);
    expect(Object.keys(await s.pin("__proto__", pair))).toEqual(["__proto__"]);
  });

  test("ISC-60.2: unpin drops it and only it", async () => {
    const kv = memoryKV();
    const s = new ModelStore(kv);
    await s.pin("a", pair);
    await s.pin("b", pair);
    await s.unpin("a");
    expect(await s.load()).toEqual({ b: pair });
  });
});

describe("ISC-57.1: junk in models.v1 is dropped on load", () => {
  test("bad entries go, good ones stay", async () => {
    const good = { vendor: "Ollama", model: "llama3.2:1b" };
    const raw = JSON.stringify({
      pins: {
        summarize: good,
        nul: { vendor: "Ollama", model: "a\0b" },
        nulVendor: { vendor: "Oll\0ama", model: "m" },
        number: { vendor: "Ollama", model: 7 },
        missing: { model: "m" },
        empty: { vendor: "", model: "m" },
        flag: { vendor: "Ollama", model: "--config=/x" },
        newline: { vendor: "Ollama", model: "m\nx" },
        "../evil": good,
        "-x": good,
        str: "Ollama|m",
      },
    });
    const kv = memoryKV({ "models.v1": raw });
    expect(await new ModelStore(kv).load()).toEqual({ summarize: good });
  });

  test("corrupt JSON or the wrong shape reads as no pins", async () => {
    for (const raw of ["{", "[]", '"x"', '{"pins":[]}', '{"pins":null}', "null"]) {
      const kv = memoryKV({ "models.v1": raw });
      expect(await new ModelStore(kv).load()).toEqual({});
    }
  });

  test("a pin refuses a pair it would drop on load", async () => {
    const kv = memoryKV();
    const s = new ModelStore(kv);
    await expect(s.pin("summarize", { vendor: "Ollama", model: "--x" })).rejects.toThrow();
    await expect(s.pin("../x", { vendor: "Ollama", model: "m" })).rejects.toThrow();
    expect(kv.data.has("models.v1")).toBe(false);
  });
});

describe("ISC-62: model pins never touch usage.v1", () => {
  test("the raw usage string is byte-identical after pins, a rename and unpins", async () => {
    const kv = memoryKV();
    const usage = new UsageStore(kv);
    await usage.togglePin("pattern:summarize");
    await usage.recordRun("pattern:summarize");
    const before = kv.data.get("usage.v1");
    expect(before).toBeDefined();
    const s = new ModelStore(kv);
    await s.pin("summarize", { vendor: "Ollama", model: "llama3.2:1b" });
    await s.rename("summarize", "summarize2");
    await s.unpin("summarize2");
    await s.pin("x", { vendor: "Ollama", model: "llama3.2:1b" });
    await s.unpin("x");
    expect(kv.data.get("usage.v1")).toBe(before!);
  });

  test("concurrent pins, with a usage change between them, all land", async () => {
    // A KV whose reads yield, so two unqueued read-modify-writes would interleave.
    const m = new Map<string, string>();
    const kv: KV = {
      get: async (k) => (await Bun.sleep(1), m.get(k)),
      set: async (k, v) => void m.set(k, v),
    };
    const s = new ModelStore(kv);
    await Promise.all([
      s.pin("a", { vendor: "Ollama", model: "m1" }),
      new UsageStore(kv).togglePin("pattern:a"),
      s.pin("b", { vendor: "Ollama", model: "m2" }),
    ]);
    expect(Object.keys(await s.load()).sort()).toEqual(["a", "b"]);
    expect((await new UsageStore(kv).load()).pins).toEqual(["pattern:a"]);
  });
});
