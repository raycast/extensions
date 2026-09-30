import assert from "node:assert/strict";
import test from "node:test";
import {
  COINPAPRIKA_TICKER_URL,
  fetchMarketSnapshot,
  type MarketSnapshot,
  parseCachedSnapshot,
  resolveMarketState,
  WHATSONCHAIN_INFO_URL,
} from "../src/lib/market-data.ts";

const ticker = {
  last_updated: "2026-07-18T15:07:16Z",
  quotes: {
    USD: {
      price: 13.44,
      percent_change_24h: 2.14,
      volume_24h: 14_881_522,
      market_cap: 269_636_251,
    },
  },
};

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("combines validated ticker and chain data", async () => {
  const fetcher = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url === COINPAPRIKA_TICKER_URL) return jsonResponse(ticker);
    if (url === WHATSONCHAIN_INFO_URL) return jsonResponse({ blocks: 958_431 });
    return jsonResponse({}, 404);
  }) as typeof fetch;

  assert.deepEqual(await fetchMarketSnapshot(fetcher), {
    priceUsd: 13.44,
    percentChange24h: 2.14,
    volume24hUsd: 14_881_522,
    marketCapUsd: 269_636_251,
    blockHeight: 958_431,
    updatedAt: "2026-07-18T15:07:16.000Z",
  });
});

test("keeps price data available when the chain API fails", async () => {
  const fetcher = (async (input: string | URL | Request) => {
    if (String(input) === COINPAPRIKA_TICKER_URL) return jsonResponse(ticker);
    return jsonResponse({ error: "unavailable" }, 503);
  }) as typeof fetch;

  const snapshot = await fetchMarketSnapshot(fetcher);
  assert.equal(snapshot.priceUsd, 13.44);
  assert.equal(snapshot.blockHeight, undefined);
});

test("rejects malformed required ticker fields", async () => {
  const fetcher = (async (input: string | URL | Request) => {
    if (String(input) === COINPAPRIKA_TICKER_URL) {
      return jsonResponse({
        ...ticker,
        quotes: { USD: { ...ticker.quotes.USD, price: "13.44" } },
      });
    }
    return jsonResponse({ blocks: 958_431 });
  }) as typeof fetch;

  await assert.rejects(() => fetchMarketSnapshot(fetcher), /invalid price/);
});

test("accepts valid cached data and rejects corrupt cache entries", () => {
  const snapshot: MarketSnapshot = {
    priceUsd: 13.44,
    percentChange24h: 2.14,
    volume24hUsd: 14_881_522,
    marketCapUsd: 269_636_251,
    blockHeight: 958_431,
    updatedAt: "2026-07-18T15:07:16.000Z",
  };

  assert.deepEqual(parseCachedSnapshot(JSON.stringify(snapshot)), snapshot);
  assert.equal(parseCachedSnapshot(undefined), undefined);
  assert.equal(parseCachedSnapshot("not json"), undefined);
  assert.equal(
    parseCachedSnapshot(JSON.stringify({ ...snapshot, priceUsd: null })),
    undefined,
  );
  assert.equal(
    parseCachedSnapshot(
      JSON.stringify({ ...snapshot, updatedAt: "not a date" }),
    ),
    undefined,
  );
});

test("returns last-known-good data instead of rejecting during a total outage", async () => {
  const snapshot: MarketSnapshot = {
    priceUsd: 13.44,
    percentChange24h: 2.14,
    volume24hUsd: 14_881_522,
    marketCapUsd: 269_636_251,
    blockHeight: 958_431,
    updatedAt: "2026-07-18T15:07:16.000Z",
  };
  const unavailableFetcher = (async () =>
    jsonResponse({ error: "unavailable" }, 503)) as typeof fetch;

  const state = await resolveMarketState(
    JSON.stringify(snapshot),
    unavailableFetcher,
  );
  assert.deepEqual(state.snapshot, snapshot);
  assert.equal(state.isStale, true);
  assert.match(state.error ?? "", /HTTP 503/);
});
