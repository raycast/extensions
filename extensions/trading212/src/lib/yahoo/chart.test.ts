import { describe, expect, it, vi } from "vitest";
import {
  CHART_RANGES,
  fetchChart,
  majorCurrency,
  probeYahooCurrency,
  isPriceChartLoading,
  parseChartResponse,
  priceChartKey,
  priceInMajorUnits,
  RANGE_PARAMS,
  toMajorUnits,
  type PriceSeries,
} from "./chart";

const fixture = {
  chart: {
    error: null,
    result: [
      {
        meta: {
          currency: "GBp",
          exchangeName: "LSE",
          fullExchangeName: "LSE Full",
          chartPreviousClose: 9400,
          regularMarketPrice: 9512,
          regularMarketTime: 1_700_000_300,
        },
        timestamp: [1_700_000_000, 1_700_000_100, 1_700_000_200, 1_700_000_300],
        indicators: { quote: [{ close: [9400, null, 9450, null] }] },
      },
    ],
  },
};

describe("priceInMajorUnits", () => {
  it("converts pence and other minor currencies", () => {
    expect(priceInMajorUnits(9512, "GBX")).toEqual({ price: 95.12, currency: "GBP" });
    expect(priceInMajorUnits(9512, "GBp")).toEqual({ price: 95.12, currency: "GBP" });
    expect(priceInMajorUnits(1000, "ZAc")).toEqual({ price: 10, currency: "ZAR" });
    expect(priceInMajorUnits(1000, "ILA")).toEqual({ price: 10, currency: "ILS" });
  });
  it("leaves other currencies alone", () => {
    expect(priceInMajorUnits(228.4, "USD")).toEqual({ price: 228.4, currency: "USD" });
  });
});

describe("parseChartResponse", () => {
  it("drops null closes and converts timestamps to ms", () => {
    const s = parseChartResponse(fixture);
    expect(s.points).toEqual([
      { t: 1_700_000_000_000, close: 9400 },
      { t: 1_700_000_200_000, close: 9450 },
    ]);
    expect(s.currency).toBe("GBp");
    expect(s.exchangeName).toBe("LSE Full");
    expect(s.previousClose).toBe(9400);
    expect(s.price).toBe(9512);
    expect(s.marketTime).toBe(1_700_000_300_000);
  });
  it("falls back when optional meta fields are missing", () => {
    const partial = {
      chart: {
        error: null,
        result: [
          {
            meta: { currency: "USD" },
            timestamp: [10, 20, 30],
            indicators: { quote: [{ close: [5, 6, null] }] },
          },
        ],
      },
    };
    const s = parseChartResponse(partial);
    expect(s.price).toBe(6);
    expect(s.previousClose).toBe(5);
    expect(s.marketTime).toBe(20_000);
    expect(s.exchangeName).toBe("");
  });
  it("prefers meta.previousClose when chartPreviousClose is absent", () => {
    const s = parseChartResponse({
      chart: {
        result: [
          { meta: { currency: "USD", previousClose: 4 }, timestamp: [1], indicators: { quote: [{ close: [5] }] } },
        ],
      },
    });
    expect(s.previousClose).toBe(4);
  });
  it("throws when there are no points", () => {
    expect(() =>
      parseChartResponse({
        chart: { result: [{ meta: { currency: "USD" }, timestamp: [1], indicators: { quote: [{ close: [null] }] } }] },
      }),
    ).toThrow();
  });
  it("throws on chart.error", () => {
    expect(() =>
      parseChartResponse({ chart: { result: null, error: { code: "Not Found", description: "No data" } } }),
    ).toThrow(/No data/);
  });
  it("throws on a missing result", () => {
    expect(() => parseChartResponse({ chart: { result: [], error: null } })).toThrow();
    expect(() => parseChartResponse({})).toThrow();
  });
});

describe("toMajorUnits", () => {
  it("divides points, previousClose and price for pence series", () => {
    const s = toMajorUnits(parseChartResponse(fixture));
    expect(s.currency).toBe("GBP");
    expect(s.points.map((p) => p.close)).toEqual([94, 94.5]);
    expect(s.previousClose).toBe(94);
    expect(s.price).toBe(95.12);
  });
  it("returns USD series unchanged", () => {
    const s: PriceSeries = {
      symbol: "A",
      currency: "USD",
      exchangeName: "N",
      points: [{ t: 1, close: 2 }],
      previousClose: 1,
      price: 2,
      marketTime: 1,
    };
    expect(toMajorUnits(s)).toEqual(s);
  });
});

describe("ranges", () => {
  it("defines params for every range", () => {
    expect(CHART_RANGES).toEqual(["1D", "1W", "1M", "1Y", "5Y"]);
    expect(RANGE_PARAMS["1W"]).toEqual({ range: "5d", interval: "30m" });
    expect(RANGE_PARAMS["5Y"]).toEqual({ range: "5y", interval: "1wk" });
  });
});

/** A fetch that never answers; it only settles when its signal aborts. */
const hangingFetch = () =>
  vi.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      }),
  );

describe("fetchChart", () => {
  it("requests the chart endpoint and returns a major-unit series", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(fixture)));
    const s = await fetchChart("VUAA.L", "1M", fetchFn as unknown as typeof fetch);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://query1.finance.yahoo.com/v8/finance/chart/VUAA.L?range=1mo&interval=1d");
    expect((init.headers as Record<string, string>)["User-Agent"]).toContain("Mozilla/5.0");
    expect(s.symbol).toBe("VUAA.L");
    expect(s.currency).toBe("GBP");
  });
  it("throws with the status on non-2xx", async () => {
    const fetchFn = vi.fn(async () => new Response("no", { status: 429 }));
    await expect(fetchChart("X", "1M", fetchFn as unknown as typeof fetch)).rejects.toThrow("429");
  });
  it("gives up on a request that doesn't answer in time", { timeout: 1000 }, async () => {
    const fetchFn = hangingFetch();
    await expect(fetchChart("X", "1D", fetchFn as unknown as typeof fetch, 20)).rejects.toThrow();
  });
});

describe("price chart loading state", () => {
  it("keys by symbol and range, null without a symbol", () => {
    expect(priceChartKey("AAPL", "1M")).toBe("AAPL|1M");
    expect(priceChartKey(null, "1M")).toBeNull();
  });
  it("is never loading without a symbol", () => {
    expect(isPriceChartLoading({ key: null, settledKey: null, isLoading: false, hasData: false })).toBe(false);
  });
  it("is loading right after a key change, before the fetch has flagged isLoading", () => {
    expect(isPriceChartLoading({ key: "AAPL|1W", settledKey: "AAPL|1M", isLoading: false, hasData: false })).toBe(true);
  });
  it("is loading while the fetch runs", () => {
    expect(isPriceChartLoading({ key: "AAPL|1W", settledKey: "AAPL|1W", isLoading: true, hasData: true })).toBe(true);
  });
  it("is settled once the current key resolved, with or without data", () => {
    expect(isPriceChartLoading({ key: "AAPL|1W", settledKey: "AAPL|1W", isLoading: false, hasData: false })).toBe(
      false,
    );
    expect(isPriceChartLoading({ key: "AAPL|1W", settledKey: "AAPL|1W", isLoading: false, hasData: true })).toBe(false);
  });
  it("is not loading when cached data for the key is shown and nothing is running", () => {
    expect(isPriceChartLoading({ key: "AAPL|1W", settledKey: null, isLoading: false, hasData: true })).toBe(false);
  });
});

describe("majorCurrency", () => {
  it("maps minor units to their major currency", () => {
    expect(majorCurrency("GBX")).toBe("GBP");
    expect(majorCurrency("GBp")).toBe("GBP");
    expect(majorCurrency("EUR")).toBe("EUR");
  });
});

describe("probeYahooCurrency", () => {
  const json = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
  it("returns the listing's major currency", async () => {
    const fetchFn = json({
      chart: {
        result: [
          {
            meta: { currency: "GBp", regularMarketPrice: 574 },
            timestamp: [1],
            indicators: { quote: [{ close: [574] }] },
          },
        ],
        error: null,
      },
    });
    expect(await probeYahooCurrency("BP.L", fetchFn as unknown as typeof fetch)).toBe("GBP");
  });
  it("returns null when Yahoo doesn't know the symbol", async () => {
    expect(
      await probeYahooCurrency(
        "ZZZZ.DE",
        json({ chart: { result: null, error: { code: "Not Found" } } }, 404) as unknown as typeof fetch,
      ),
    ).toBeNull();
  });
  it("throws on other failures", async () => {
    await expect(probeYahooCurrency("X", json({}, 500) as unknown as typeof fetch)).rejects.toThrow("500");
  });
});
