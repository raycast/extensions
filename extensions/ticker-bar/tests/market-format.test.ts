import assert from "node:assert/strict";
import test from "node:test";
import {
  formatAge,
  formatMarketCap,
  formatMenuTitle,
  formatPercent,
  formatPrice,
  formatSubscriptPrice,
  isDexTokenQuote,
  orderedMultiTickerIds,
  orderedMultiTickerQuotes,
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
  assert.equal(formatMenuTitle(primary, "multi-ticker"), "HYPE $1.00");
});

test("subscript-zero price formatter compresses leading zeros for sub-cent tokens", () => {
  assert.equal(formatSubscriptPrice(0.000008981), "$0.0₅8981");
  assert.equal(formatSubscriptPrice(0.0000124), "$0.0₄124");
  assert.equal(formatSubscriptPrice(0.05), "$0.05");
  assert.equal(formatSubscriptPrice(150), "$150");
  assert.equal(formatSubscriptPrice("$0.000008981"), "$0.0₅8981");
  assert.equal(formatSubscriptPrice("€0.000042"), "€0.0₄42");
  assert.equal(formatSubscriptPrice("0.0000123 BTC"), "0.0₄123 BTC");
  assert.equal(formatSubscriptPrice("CA$0.00008981"), "CA$0.0₄8981");
  assert.equal(formatSubscriptPrice("£0.0000124"), "£0.0₄124");
});

test("multi-ticker title rendering formats top 3 tokens separated by pipe", () => {
  const q1: Quote = {
    ...quote("s42", 1),
    price: 0.000008981,
    priceLabel: "$0.000008981",
  };
  const q2: Quote = {
    ...quote("token2", 1),
    price: 0.0000124,
    priceLabel: "$0.0000124",
  };
  const q3: Quote = {
    ...quote("sol", 1),
    price: 180.5,
    priceLabel: "$180.50",
  };
  const q4: Quote = {
    ...quote("extra", 1),
    price: 1,
    priceLabel: "$1.00",
  };

  assert.equal(
    formatMenuTitle([q1, q2, q3, q4], "multi-ticker"),
    "S42 $0.0₅8981 | TOKEN2 $0.0₄124 | SOL $180.50",
  );
  assert.equal(
    formatMenuTitle([q1, q2], "multi-ticker"),
    "S42 $0.0₅8981 | TOKEN2 $0.0₄124",
  );
  assert.equal(formatMenuTitle([], "multi-ticker"), undefined);
});

test("compact market cap formatter formats numbers and falls back to --", () => {
  assert.equal(formatMarketCap(85_400), "$85.4K");
  assert.equal(formatMarketCap(1_420_000), "$1.42M");
  assert.equal(formatMarketCap(12_500_000), "$12.5M");
  assert.equal(formatMarketCap(12_500_000, "eur"), "€12.5M");
  assert.equal(formatMarketCap(12_500_000, "gbp"), "£12.5M");
  assert.equal(formatMarketCap(12_500_000, "cad"), "CA$12.5M");
  assert.equal(formatMarketCap(undefined), "--");
  assert.equal(formatMarketCap(0), "--");
  assert.equal(formatMarketCap(-100), "--");
});

test("preserves non-USD currency and units on subscript prices and market caps", () => {
  const eurQuote: Quote = {
    ...quote("eurcoin", 1),
    symbol: "EURC",
    price: 0.000042,
    priceLabel: "€0.000042",
    currency: "eur",
    marketCap: 12_500_000,
  };
  const btcPairQuote: Quote = {
    ...quote("btcpair", 2),
    symbol: "ALT",
    price: 0.0000123,
    priceLabel: "0.0000123 BTC",
    currency: "btc",
  };
  const gbpQuote: Quote = {
    ...quote("gbpcoin", 1),
    symbol: "GBPC",
    price: 0.0000124,
    priceLabel: "£0.0000124",
    currency: "gbp",
    marketCap: 50_000_000,
  };
  const cadQuote: Quote = {
    ...quote("cadcoin", 1),
    symbol: "CADC",
    price: 0.00008981,
    priceLabel: "CA$0.00008981",
    currency: "cad",
    marketCap: 85_400_000,
  };

  // Preserves unit prefix/suffix on prices:
  assert.equal(formatMenuTitle(eurQuote, "primary", "price"), "EURC €0.0₄42");
  assert.equal(
    formatMenuTitle(btcPairQuote, "primary", "price"),
    "ALT 0.0₄123 BTC",
  );
  assert.equal(
    formatMenuTitle([eurQuote, btcPairQuote], "multi-ticker", "price"),
    "EURC €0.0₄42 | ALT 0.0₄123 BTC",
  );

  // Formats market caps in the quote's currency:
  assert.equal(
    formatMenuTitle(eurQuote, "primary", "market-cap"),
    "EURC €12.5M",
  );
  assert.equal(
    formatMenuTitle(gbpQuote, "primary", "market-cap"),
    "GBPC £50M",
  );
  assert.equal(
    formatMenuTitle(cadQuote, "primary", "market-cap"),
    "CADC CA$85.4M",
  );
  assert.equal(
    formatMenuTitle([eurQuote, gbpQuote], "multi-ticker", "market-cap"),
    "EURC €12.5M | GBPC £50M",
  );
});

test("menu title metric toggle displays market cap across single and multi-ticker styles", () => {
  const q1: Quote = {
    ...quote("s42", 1),
    price: 0.000008981,
    priceLabel: "$0.000008981",
    marketCap: 85_400,
    changePercent: 12.5,
  };
  const q2: Quote = {
    ...quote("token2", 1),
    price: 0.0000124,
    priceLabel: "$0.0000124",
    marketCap: 1_420_000,
  };
  const qNoCap: Quote = {
    ...quote("nomcap", 1),
    price: 10,
    priceLabel: "$10.00",
  };

  assert.equal(formatMenuTitle(q1, "primary", "price"), "S42 $0.0₅8981");
  assert.equal(formatMenuTitle(q1, "primary", "market-cap"), "S42 $85.4K");
  assert.equal(formatMenuTitle(qNoCap, "primary", "market-cap"), "NOMCAP --");

  assert.equal(
    formatMenuTitle(q1, "primary-change", "market-cap"),
    "S42 $85.4K +13%",
  );

  assert.equal(
    formatMenuTitle([q1, q2], "multi-ticker", "market-cap"),
    "S42 $85.4K | TOKEN2 $1.42M",
  );
  assert.equal(
    formatMenuTitle([q1, qNoCap], "multi-ticker", "market-cap"),
    "S42 $85.4K | NOMCAP --",
  );
});

test("isDexTokenQuote identifies DEX token assets correctly", () => {
  const dexQuote1: Quote = {
    ...quote("token:solana:abc", 0),
    kind: "token",
    provider: "DexScreener",
  };
  const dexQuote2: Quote = {
    ...quote("custom", 0),
    id: "token:bsc:xyz",
    provider: "Unknown",
  };
  const btcQuote: Quote = {
    ...quote("crypto:bitcoin", 0),
    kind: "crypto",
    provider: "CoinGecko",
  };
  const stockQuote: Quote = {
    ...quote("stock:SPY", 0),
    kind: "stock",
    provider: "Yahoo Finance",
  };

  assert.equal(isDexTokenQuote(dexQuote1), true);
  assert.equal(isDexTokenQuote(dexQuote2), true);
  assert.equal(isDexTokenQuote(btcQuote), false);
  assert.equal(isDexTokenQuote(stockQuote), false);
});

test("marketCapDexOnly renders market cap for DEX tokens and price for others", () => {
  const dexToken: Quote = {
    ...quote("s42", 1),
    id: "token:solana:s42",
    kind: "token",
    symbol: "S42",
    price: 0.000008981,
    priceLabel: "$0.000008981",
    marketCap: 85_400,
    provider: "DexScreener",
  };
  const btcToken: Quote = {
    ...quote("btc", 2),
    id: "crypto:bitcoin",
    kind: "crypto",
    symbol: "BTC",
    price: 95_000,
    priceLabel: "$95,000",
    marketCap: 1_850_000_000_000,
    provider: "CoinGecko",
  };
  const stockToken: Quote = {
    ...quote("spy", 0.5),
    id: "stock:SPY",
    kind: "stock",
    symbol: "SPY",
    price: 550,
    priceLabel: "$550.00",
    provider: "Yahoo Finance",
  };

  // With marketCapDexOnly = true:
  // DEX token shows market cap
  assert.equal(
    formatMenuTitle(dexToken, "primary", "market-cap", true),
    "S42 $85.4K",
  );
  // Non-DEX tokens show regular price instead of market cap
  assert.equal(
    formatMenuTitle(btcToken, "primary", "market-cap", true),
    "BTC $95,000",
  );
  assert.equal(
    formatMenuTitle(stockToken, "primary", "market-cap", true),
    "SPY $550.00",
  );

  // In multi-ticker:
  assert.equal(
    formatMenuTitle(
      [dexToken, btcToken, stockToken],
      "multi-ticker",
      "market-cap",
      true,
    ),
    "S42 $85.4K | BTC $95,000 | SPY $550.00",
  );

  // With marketCapDexOnly = false:
  // All tokens show market cap (or -- if unavailable)
  assert.equal(
    formatMenuTitle(
      [dexToken, btcToken, stockToken],
      "multi-ticker",
      "market-cap",
      false,
    ),
    "S42 $85.4K | BTC $1.85T | SPY --",
  );
});

test("orders multi-ticker items with active primary token first and no duplicates", () => {
  const watchlist = [
    "stock:SPY",
    "crypto:solana",
    "crypto:bitcoin",
    "stock:AAPL",
  ];
  const quotesMap: Record<string, Quote> = {
    "stock:SPY": quote("spy", 1),
    "crypto:solana": quote("sol", 2),
    "crypto:bitcoin": quote("btc", 3),
    "stock:AAPL": quote("aapl", 4),
  };

  // When primary asset is the 2nd item in watchlist ("crypto:solana"):
  const idsWithSolanaPrimary = orderedMultiTickerIds(
    watchlist,
    "crypto:solana",
  );
  assert.deepEqual(idsWithSolanaPrimary, [
    "crypto:solana",
    "stock:SPY",
    "crypto:bitcoin",
  ]);

  const quotesWithSolanaPrimary = orderedMultiTickerQuotes(
    watchlist,
    quotesMap,
    "crypto:solana",
  );
  assert.equal(quotesWithSolanaPrimary[0]?.symbol, "SOL");
  assert.equal(quotesWithSolanaPrimary[1]?.symbol, "SPY");
  assert.equal(quotesWithSolanaPrimary[2]?.symbol, "BTC");
  assert.equal(quotesWithSolanaPrimary.length, 3);

  // When primary asset is not specified, it falls back to the first item:
  const defaultIds = orderedMultiTickerIds(watchlist);
  assert.deepEqual(defaultIds, [
    "stock:SPY",
    "crypto:solana",
    "crypto:bitcoin",
  ]);

  // When watchlist has fewer than 3 items or is empty:
  assert.deepEqual(orderedMultiTickerIds(["stock:SPY"], "stock:SPY"), [
    "stock:SPY",
  ]);
  assert.deepEqual(orderedMultiTickerIds([]), []);
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
