import assert from "node:assert/strict";
import test from "node:test";
import { createMicroBatcher } from "../src/market-batch.ts";

test("coalesces same-tick requests and deduplicates keys", async () => {
  const batches: string[][] = [];
  const load = createMicroBatcher<string, string>(async (keys) => {
    batches.push(keys);
    return new Map(keys.map((key) => [key, key.toUpperCase()]));
  });

  const values = await Promise.all([load("btc"), load("eth"), load("btc")]);
  assert.deepEqual(values, ["BTC", "ETH", "BTC"]);
  assert.deepEqual(batches, [["btc", "eth"]]);
});

test("rejects every request when the batch loader fails", async () => {
  const load = createMicroBatcher<string, string>(async () => {
    throw new Error("provider down");
  });
  await assert.rejects(Promise.all([load("a"), load("b")]), /provider down/);
});
