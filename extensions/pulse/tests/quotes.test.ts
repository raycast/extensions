import assert from "node:assert/strict";
import { test } from "node:test";
import { chartSvg } from "../src/lib/chart";
import { formatAxis, formatChange, formatNumber, formatPrice } from "../src/lib/format";
import { decodeSpark, decodeYahooChart } from "../src/lib/quotes";

const now = Date.UTC(2026, 10, 2, 16, 0);
const start = Date.UTC(2026, 10, 2, 14, 30) / 1000;

function chart(symbol: string) {
  return {
    chart: {
      result: [
        {
          meta: {
            symbol,
            currency: "USD",
            longName: "Apple Inc.",
            fullExchangeName: "NasdaqGS",
            regularMarketPrice: 202,
            regularMarketTime: start + 600,
            regularMarketDayHigh: 203,
            regularMarketDayLow: 199,
            previousClose: 200,
            exchangeDataDelayedBy: 0,
            currentTradingPeriod: { regular: { start, end: start + 23400 } },
            tradingPeriods: [[{ start, end: start + 23400 }]],
          },
          timestamp: [start, start + 300, start + 600],
          indicators: { quote: [{ open: [199.5, 200, 201], close: [200, null, 202] }] },
        },
      ],
      error: null,
    },
  };
}

test("decodes Yahoo's chart into a quote and today's line", () => {
  const quote = decodeYahooChart("AAPL", chart("AAPL"), now);
  assert.equal(quote.price, 202);
  assert.equal(quote.changePercent, 1);
  assert.equal(quote.currency, "USD");
  assert.equal(quote.session, "open");
  assert.equal(quote.open, 199.5);
  assert.deepEqual(
    quote.series.map((point) => point.price),
    [200, 202],
  );
  assert.deepEqual(quote.window, [start * 1000, (start + 23400) * 1000]);
  assert.equal(quote.delaySeconds, 0);
});

test("never shows another instrument's answer", () => {
  assert.throws(() => decodeYahooChart("AAPL", chart("AAPL.MX"), now), /different ticker/);
  assert.throws(() => decodeYahooChart("AAPL", { chart: { result: null, error: { code: "Not Found" } } }, now));
});

test("decodes a spark batch, skipping symbols it did not answer", () => {
  const rows = decodeSpark(
    ["AAPL", "0700.HK", "NOPE"],
    {
      AAPL: { symbol: "AAPL", close: [200, 202], previousClose: 200, fulldayPrice: 190 },
      "0700.HK": { symbol: "0700.HK", close: [390, 392.2], chartPreviousClose: 383.6 },
    },
    now,
  );
  assert.deepEqual(Object.keys(rows), ["AAPL", "0700.HK"]);
  assert.equal(rows.AAPL.changePercent, 1);
  assert.equal(rows["0700.HK"].price, 392.2);
});

test("formats prices the way Pulse does", () => {
  assert.equal(formatNumber(1234567.891), "1,234,567.89");
  assert.equal(formatNumber(0.00000441), "0.00000441");
  assert.equal(formatPrice(0.5, "USDT"), "0.50 USDT");
  assert.equal(formatChange(1.234), "+1.23%");
  assert.equal(formatChange(-0.5), "-0.50%");
  assert.equal(formatChange(null), "—");
  assert.equal(formatPrice(229000, "KRW"), "229,000 KRW");
  assert.equal(formatPrice(3051.5, "JPY"), "3,051.50 JPY");
  assert.equal(formatAxis(78164.01), "78,164");
  assert.equal(formatAxis(397.2), "397.20");
});

test("draws a chart only with two or more points", () => {
  const series = [
    { time: start * 1000, price: 200 },
    { time: (start + 300) * 1000, price: 202 },
  ];
  const options = { reference: 199, window: null, appearance: "dark" as const, time: () => "09:30" };
  assert.equal(chartSvg({ ...options, series: series.slice(0, 1) }), null);
  const svg = chartSvg({ ...options, series });
  assert.ok(svg?.startsWith("<svg"));
  assert.ok(svg?.includes("#3DD27A"), "a rise above the previous close is green");
});
