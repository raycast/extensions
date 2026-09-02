import assert from "node:assert/strict";
import test from "node:test";
import {
  formatAge,
  formatMenuTitle,
  formatPercent,
  formatPrice,
  quoteFreshness,
  shouldRefreshQuote,
  truncateText,
} from "../src/market-format.ts";
import type { Quote } from "../src/market-types.ts";

const NOW = Date.parse("2026-07-30T18:00:00.000Z");
const RUNTIME_NOW = Date.now();

function quote(id: string, changePercent: number, minutesOld = 1): Quote {
  const timestamp = new Date(RUNTIME_NOW - minutesOld * 60_000).toISOString();
  return {
    id,
    kind: "crypto",
    symbol: id.toUpperCase(),
    name: id,
    price: 1,
    priceLabel: "$1.00",
    changePercent,
    provider: "Test",
    asOf: timestamp,
    lastSuccessAt: timestamp,
  };
}

test("preserves significant digits for micro-priced assets", () => {
  assert.notEqual(formatPrice(0.00000042), "$0.00");
  assert.match(formatPrice(0.00000042), /42/);
  assert.equal(formatPrice(72.3), "$72.30");
  assert.equal(formatPrice(0.72, "probability"), "72%");
});

test("formats percentages and relative ages", () => {
  assert.equal(formatPercent(1.24), "+1.2%");
  assert.equal(formatPercent(-12.4), "-12%");
  assert.equal(formatAge("2026-07-30T17:55:00.000Z", NOW), "5m ago");
  assert.equal(truncateText("A long Polymarket question", 12), "A long Poly…");
});

test("marks old quotes stale", () => {
  assert.equal(quoteFreshness(quote("stale", 100, 30), RUNTIME_NOW), "stale");
});

test("menu bar styles produce distinct titles", () => {
  const primary = quote("hype", 1);
  assert.equal(formatMenuTitle(primary, "primary"), "HYPE $1.00");
  assert.equal(formatMenuTitle(primary, "primary-change"), "HYPE $1.00 +1.0%");
});

test("explicit refresh errors mark cached quotes stale", () => {
  const failed = { ...quote("failed", 1), error: "429 Too Many Requests" };
  assert.equal(quoteFreshness(failed, RUNTIME_NOW), "stale");
});

test("manual refresh bypasses TTL but still respects a rate-limit cooldown", () => {
  const retryAfterAt = new Date(RUNTIME_NOW + 60_000).toISOString();
  assert.equal(
    shouldRefreshQuote(
      quote("fresh", 0, 0),
      { retryAfterAt },
      60_000,
      true,
      RUNTIME_NOW,
    ),
    false,
  );
  assert.equal(
    shouldRefreshQuote(
      quote("fresh", 0, 0),
      undefined,
      60_000,
      true,
      RUNTIME_NOW,
    ),
    true,
  );
});
