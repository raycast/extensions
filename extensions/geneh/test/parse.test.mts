import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseAmount } from "../src/parse.ts";

test("reads amounts the way people type them", () => {
  assert.deepEqual(parseAmount("100 USD"), { amount: 100, currency: "usd" });
  assert.deepEqual(parseAmount("usd 100"), { amount: 100, currency: "usd" });
  assert.deepEqual(parseAmount("$1,299.99"), { amount: 1299.99, currency: "usd" });
  assert.deepEqual(parseAmount("50 €"), { amount: 50, currency: "eur" });
  assert.deepEqual(parseAmount("100 dollar"), { amount: 100, currency: "usd" });
  assert.deepEqual(parseAmount("١٠٠ دولار"), { amount: 100, currency: "usd" });
  assert.deepEqual(parseAmount("٢٥٠٫٥ ريال"), { amount: 250.5, currency: "sar" });
  assert.deepEqual(parseAmount("1.200,50 eur"), { amount: 1200.5, currency: "eur" });
});

test("ignores text that is not an amount", () => {
  assert.equal(parseAmount(""), null);
  assert.equal(parseAmount("100"), null);
  assert.equal(parseAmount("usd"), null);
  assert.equal(parseAmount("100 usdt"), null);
});

test("lite.js is the same file as packages/lite", () => {
  const here = (p: string) => new URL(p, import.meta.url);
  assert.equal(readFileSync(here("../src/lite.js"), "utf8"), readFileSync(here("../../../packages/lite/src/lite.js"), "utf8"));
  assert.equal(readFileSync(here("../src/lite.d.ts"), "utf8"), readFileSync(here("../../../packages/lite/src/lite.d.ts"), "utf8"));
});
