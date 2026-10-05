import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { mapWithConcurrency } from "../src/lib/limited-concurrency.ts";

test("mapWithConcurrency preserves order and never exceeds the limit", async () => {
  const activeItems = new Set<number>();
  let maxActive = 0;

  const result = await mapWithConcurrency([0, 1, 2, 3, 4, 5], 3, async (item) => {
    activeItems.add(item);
    maxActive = Math.max(maxActive, activeItems.size);
    await new Promise((resolve) => setTimeout(resolve, (5 - item) * 2));
    activeItems.delete(item);
    return item * 10;
  });

  assert.deepEqual(result, [0, 10, 20, 30, 40, 50]);
  assert.ok(maxActive <= 3);
});

test("mapWithConcurrency handles empty input without invoking the worker", async () => {
  let calls = 0;
  const result = await mapWithConcurrency([], 3, async () => {
    calls += 1;
    return "unexpected";
  });

  assert.deepEqual(result, []);
  assert.equal(calls, 0);
});

test("mapWithConcurrency rejects non-finite or otherwise invalid limits", async () => {
  for (const limit of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    await assert.rejects(() => mapWithConcurrency([1], limit, async (item) => item), /limit/i);
  }
});

test("mapWithConcurrency stops starting new work after a worker rejects", async () => {
  const started: number[] = [];
  let releaseFirst: (() => void) | undefined;
  const firstStarted = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });

  const pending = mapWithConcurrency([0, 1, 2, 3, 4], 2, async (item) => {
    started.push(item);
    if (item === 0) {
      await firstStarted;
      throw new Error("boom");
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
    return item;
  });

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(started, [0, 1]);
  releaseFirst?.();
  await assert.rejects(pending, /boom/);
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.deepEqual(started, [0, 1]);
});

test("mapWithConcurrency stops starting new work after an abort rejection", async () => {
  const started: number[] = [];
  const abortError = Object.assign(new Error("cancelled"), { name: "AbortError" });

  const pending = mapWithConcurrency([0, 1, 2, 3], 2, async (item) => {
    started.push(item);
    if (item === 0) throw abortError;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return item;
  });

  await assert.rejects(pending, { name: "AbortError" });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(started, [0, 1]);
});

test("duplicate values can be supplied after deduplication without duplicate work", async () => {
  const items = ["a", "b", "a", "c", "b"];
  const uniqueItems = [...new Set(items)];
  const calls: string[] = [];

  const result = await mapWithConcurrency(uniqueItems, 3, async (item) => {
    calls.push(item);
    return item.toUpperCase();
  });

  assert.deepEqual(result, ["A", "B", "C"]);
  assert.deepEqual(calls.sort(), ["a", "b", "c"]);
});

test("active-runs does not cache a title after its effect signal is aborted", () => {
  const source = readFileSync(new URL("../src/active-runs.tsx", import.meta.url), "utf8");
  assert.match(source, /\.then\(\(envelope\) => \{[\s\S]*?throwIfAborted\(\);[\s\S]*?titles\.current\.set/);
  assert.match(source, /\.catch\(\(reason: unknown\) => \{[\s\S]*?throwIfAborted\(\);[\s\S]*?titles\.current\.set/);
});
