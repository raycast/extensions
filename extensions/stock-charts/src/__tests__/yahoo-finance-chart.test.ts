import { describe, it, expect, vi } from "vitest";

vi.mock("../yahoo-finance/client", () => ({
  get: vi.fn(),
  YahooFinanceError: class YahooFinanceError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "YahooFinanceError";
      this.status = status;
    }
  },
}));

import { fetchChart, INTERVAL_MAP } from "../yahoo-finance/chart";
import { get } from "../yahoo-finance/client";
import chart1d from "./fixtures/yahoo-chart-1d.json";
import chart1y from "./fixtures/yahoo-chart-1y.json";

describe("INTERVAL_MAP", () => {
  it("contains all 9 intervals", () => {
    const keys = Object.keys(INTERVAL_MAP);
    expect(keys).toHaveLength(9);
    expect(keys).toEqual([
      "1D",
      "1W",
      "1M",
      "3M",
      "6M",
      "YTD",
      "1Y",
      "2Y",
      "5Y",
    ]);
  });

  it("1D maps to range 1d and interval 5m", () => {
    expect(INTERVAL_MAP["1D"]).toEqual({ range: "1d", interval: "5m" });
  });

  it("1W maps to range 5d and interval 15m", () => {
    expect(INTERVAL_MAP["1W"]).toEqual({ range: "5d", interval: "15m" });
  });

  it("1M maps to range 1mo and interval 1h", () => {
    expect(INTERVAL_MAP["1M"]).toEqual({ range: "1mo", interval: "1h" });
  });

  it("3M maps to range 3mo and interval 1d", () => {
    expect(INTERVAL_MAP["3M"]).toEqual({ range: "3mo", interval: "1d" });
  });

  it("6M maps to range 6mo and interval 1d", () => {
    expect(INTERVAL_MAP["6M"]).toEqual({ range: "6mo", interval: "1d" });
  });

  it("YTD maps to range ytd and interval 1d", () => {
    expect(INTERVAL_MAP["YTD"]).toEqual({ range: "ytd", interval: "1d" });
  });

  it("1Y maps to range 1y and interval 1d", () => {
    expect(INTERVAL_MAP["1Y"]).toEqual({ range: "1y", interval: "1d" });
  });

  it("2Y maps to range 2y and interval 1wk", () => {
    expect(INTERVAL_MAP["2Y"]).toEqual({ range: "2y", interval: "1wk" });
  });

  it("5Y maps to range 5y and interval 1wk", () => {
    expect(INTERVAL_MAP["5Y"]).toEqual({ range: "5y", interval: "1wk" });
  });
});

describe("fetchChart", () => {
  it("parses 1D chart fixture correctly", async () => {
    vi.mocked(get).mockResolvedValue(chart1d);

    const data = await fetchChart("AAPL", "1D");

    expect(data.timestamps).toEqual([
      1716120600, 1716120900, 1716121200, 1716121500, 1716121800,
    ]);
    expect(data.closes).toEqual([197.1, 197.5, 198.0, 198.2, 198.42]);
    expect(data.opens).toEqual([197.0, 197.1, 197.5, 198.0, 198.2]);
    expect(data.highs).toEqual([197.2, 197.6, 198.1, 198.3, 198.5]);
    expect(data.lows).toEqual([196.9, 197.05, 197.45, 197.95, 198.15]);
    expect(data.volumes).toEqual([1000000, 1200000, 800000, 900000, 1100000]);
  });

  it("parses meta fields correctly", async () => {
    vi.mocked(get).mockResolvedValue(chart1d);

    const data = await fetchChart("AAPL", "1D");

    expect(data.meta.regularMarketPrice).toBe(198.42);
    expect(data.meta.chartPreviousClose).toBe(197.19);
    expect(data.meta.currency).toBe("USD");
    expect(data.meta.symbol).toBe("AAPL");
  });

  it("parses 1Y chart fixture with 10 data points", async () => {
    vi.mocked(get).mockResolvedValue(chart1y);

    const data = await fetchChart("AAPL", "1Y");

    expect(data.timestamps).toHaveLength(10);
    expect(data.closes).toHaveLength(10);
    expect(data.closes[0]).toBe(168.5);
    expect(data.closes[9]).toBe(198.42);
  });

  it("calls get with correct path and params", async () => {
    vi.mocked(get).mockResolvedValue(chart1d);

    await fetchChart("AAPL", "1D");

    expect(get).toHaveBeenCalledWith(
      "/v8/finance/chart/AAPL",
      { range: "1d", interval: "5m", includePrePost: "false" },
      undefined,
    );
  });

  it("passes abort signal to get", async () => {
    vi.mocked(get).mockResolvedValue(chart1d);
    const controller = new AbortController();

    await fetchChart("AAPL", "1D", controller.signal);

    expect(get).toHaveBeenCalledWith(
      "/v8/finance/chart/AAPL",
      expect.any(Object),
      controller.signal,
    );
  });
});
