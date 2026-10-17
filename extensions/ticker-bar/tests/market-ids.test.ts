import assert from "node:assert/strict";
import test from "node:test";
import {
  assetFromId,
  normalizeAssetId,
  parseWatchlistInput,
} from "../src/market-ids.ts";

test("normalizes every supported asset kind", () => {
  assert.equal(normalizeAssetId("aapl"), "stock:AAPL");
  assert.equal(normalizeAssetId("crypto:Bitcoin"), "crypto:bitcoin");
  assert.equal(
    normalizeAssetId("token:base:0x4200000000000000000000000000000000000006"),
    "token:base:0x4200000000000000000000000000000000000006",
  );
  assert.equal(
    normalizeAssetId("polymarket:540817:Yes"),
    "polymarket:540817:yes",
  );
  assert.equal(normalizeAssetId("binance:btcusdt"), "binance:BTCUSDT");
  assert.equal(normalizeAssetId("binanceperp:ethusdt"), "binanceperp:ETHUSDT");
});

test("rejects malformed and unknown asset IDs", () => {
  assert.equal(normalizeAssetId("unknown:value"), undefined);
  assert.equal(normalizeAssetId("stock:"), undefined);
  assert.equal(normalizeAssetId("crypto:bad id"), undefined);
  assert.equal(normalizeAssetId("token::address"), undefined);
  assert.equal(normalizeAssetId("binance:BTC/USD"), undefined);
});

test("parses, deduplicates, and reports invalid watchlist entries", () => {
  const parsed = parseWatchlistInput(`
    stock:SPY
    crypto:bitcoin
    binance:BTCUSDT
    stock:SPY
    nonsense:value
  `);
  assert.deepEqual(parsed.ids, [
    "stock:SPY",
    "crypto:bitcoin",
    "binance:BTCUSDT",
  ]);
  assert.deepEqual(parsed.invalid, ["nonsense:value"]);
});

test("creates exact provider assets from normalized IDs", () => {
  assert.deepEqual(assetFromId("binanceperp:ETHUSDT"), {
    id: "binanceperp:ETHUSDT",
    kind: "binanceperp",
    symbol: "ETH",
    name: "ETH Perpetual",
    provider: "Binance Futures",
    query: "ETHUSDT",
  });
  assert.equal(
    assetFromId("token:base:0x4200000000000000000000000000000000000006")?.chain,
    "base",
  );
});
