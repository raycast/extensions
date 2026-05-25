import { describe, it, expect, vi, beforeEach } from "vitest";

import { buildChartConfig, buildChartUrl } from "../chart/quickchart";
import { YahooFinanceError } from "../yahoo-finance/client";
import { INTERVAL_MAP } from "../yahoo-finance/chart";
import searchFixture from "./fixtures/yahoo-search-aapl.json";
import quoteFixture from "./fixtures/yahoo-quote-aapl.json";

describe("Acceptance: Search returns results", () => {
  it("search fixture has quotes with symbols", () => {
    expect(searchFixture.quotes).toBeInstanceOf(Array);
    expect(searchFixture.quotes.length).toBeGreaterThan(0);
    expect(searchFixture.quotes[0].symbol).toBe("AAPL");
    expect(searchFixture.quotes[0].shortname).toBeDefined();
    expect(searchFixture.quotes[0].quoteType).toBe("EQUITY");
  });

  it("search fixture contains multiple results", () => {
    expect(searchFixture.quotes.length).toBe(2);
    expect(searchFixture.quotes[1].symbol).toBe("APLE");
  });
});

describe("Acceptance: Chart URL generated for all intervals", () => {
  const sampleTimestamps = [
    1716120600, 1716120900, 1716121200, 1716121500, 1716121800,
  ];
  const samplePrices = [197.1, 197.5, 198.0, 198.2, 198.42];

  const intervals = ["1D", "1W", "1M", "3M", "6M", "YTD", "1Y", "2Y", "5Y"] as const;

  for (const interval of intervals) {
    it(`produces a valid URL for interval ${interval}`, async () => {
      const url = await buildChartUrl(sampleTimestamps, samplePrices, interval);
      expect(url).toMatch(/^https:\/\/quickchart\.io\//);
    });
  }
});

describe("Acceptance: Metadata has required fields", () => {
  it("quote fixture contains all required metadata fields", () => {
    const quote = quoteFixture.quoteResponse.result[0];

    expect(quote.symbol).toBe("AAPL");
    expect(quote.currency).toBe("USD");
    expect(quote.marketCap).toBe(3070000000000);
    expect(quote.trailingPE).toBe(32.5);
    expect(quote.fiftyTwoWeekHigh).toBe(237.49);
    expect(quote.fiftyTwoWeekLow).toBe(164.08);
    expect(quote.dividendYield).toBe(0.44);
    expect(quote.epsTrailingTwelveMonths).toBe(6.13);
    expect(quote.regularMarketPrice).toBe(198.42);
    expect(quote.regularMarketChange).toBe(1.23);
    expect(quote.regularMarketChangePercent).toBe(0.6237);
  });
});

describe("Acceptance: Green/red matches direction", () => {
  it("up data produces green chart config", () => {
    const labels = ["a", "b", "c"];
    const pricesUp = [100, 105, 110];
    const config = buildChartConfig(labels, pricesUp, true);
    expect(config.data.datasets[0].borderColor).toBe("#34C759");
  });

  it("down data produces red chart config", () => {
    const labels = ["a", "b", "c"];
    const pricesDown = [110, 105, 100];
    const config = buildChartConfig(labels, pricesDown, false);
    expect(config.data.datasets[0].borderColor).toBe("#FF3B30");
  });
});

describe("Acceptance: Error handling", () => {
  it("YahooFinanceError with status 404 has correct message", () => {
    const error = new YahooFinanceError(
      "Yahoo Finance 404: /v8/finance/chart/INVALID",
      404,
    );
    expect(error.status).toBe(404);
    expect(error.message).toContain("404");
    expect(error.name).toBe("YahooFinanceError");
    expect(error).toBeInstanceOf(Error);
  });

  it("YahooFinanceError with status 0 for network issues", () => {
    const error = new YahooFinanceError("No Set-Cookie header from Yahoo", 0);
    expect(error.status).toBe(0);
    expect(error.message).toContain("Set-Cookie");
  });
});

describe("Acceptance: Large dataset triggers POST", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("365 data points are downsampled to ~60 in the chart URL", async () => {
    const timestamps = Array.from(
      { length: 365 },
      (_, i) => 1700000000 + i * 86400,
    );
    const prices = Array.from({ length: 365 }, (_, i) => 170 + i * 0.08);

    const url = await buildChartUrl(timestamps, prices, "1Y");
    expect(url).toContain("quickchart.io");
    const decoded = decodeURIComponent(url);
    const dataMatch = decoded.match(/"data":\[([^\]]+)\]/);
    expect(dataMatch).toBeTruthy();
    const dataPoints = dataMatch![1].split(",").length;
    expect(dataPoints).toBeLessThanOrEqual(65);
    expect(dataPoints).toBeGreaterThanOrEqual(55);
  });
});

describe("Acceptance: INTERVAL_MAP completeness", () => {
  it("all intervals have valid range strings", () => {
    for (const [, mapping] of Object.entries(INTERVAL_MAP)) {
      expect(mapping.range).toMatch(/^(\d+[dwmy]o?|ytd)$/);
    }
  });

  it("all intervals have valid interval strings", () => {
    for (const [, mapping] of Object.entries(INTERVAL_MAP)) {
      expect(mapping.interval).toMatch(/^\d+[mdhwk]+$/);
    }
  });
});
