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

import { get } from "../yahoo-finance/client";
import { search } from "../yahoo-finance/search";
import { quote, currentPriceInfo, type Quote } from "../yahoo-finance/quote";

describe("search()", () => {
  it("calls correct endpoint with query and params", async () => {
    vi.mocked(get).mockResolvedValue({ quotes: [] });

    await search("AAPL");

    expect(get).toHaveBeenCalledWith(
      "/v1/finance/search",
      { q: "AAPL", quotesCount: "12", newsCount: "0", listsCount: "0" },
      undefined,
    );
  });

  it("passes abort signal to get", async () => {
    vi.mocked(get).mockResolvedValue({ quotes: [] });
    const controller = new AbortController();

    await search("TSLA", controller.signal);

    expect(get).toHaveBeenCalledWith(
      "/v1/finance/search",
      expect.any(Object),
      controller.signal,
    );
  });

  it("returns parsed search results", async () => {
    const mockResult = {
      quotes: [
        { symbol: "AAPL", shortname: "Apple Inc.", quoteType: "EQUITY" },
      ],
    };
    vi.mocked(get).mockResolvedValue(mockResult);

    const result = await search("AAPL");

    expect(result.quotes).toHaveLength(1);
    expect(result.quotes[0].symbol).toBe("AAPL");
  });
});

describe("quote()", () => {
  it("joins symbols and calls correct endpoint", async () => {
    vi.mocked(get).mockResolvedValue({ quoteResponse: { result: [] } });

    await quote(["AAPL", "TSLA", "MSFT"]);

    expect(get).toHaveBeenCalledWith(
      "/v7/finance/quote",
      { symbols: "AAPL,TSLA,MSFT" },
      undefined,
    );
  });

  it("passes abort signal to get", async () => {
    vi.mocked(get).mockResolvedValue({ quoteResponse: { result: [] } });
    const controller = new AbortController();

    await quote(["AAPL"], controller.signal);

    expect(get).toHaveBeenCalledWith(
      "/v7/finance/quote",
      expect.any(Object),
      controller.signal,
    );
  });

  it("returns the result array from response", async () => {
    const quotes = [
      { symbol: "AAPL", regularMarketPrice: 198.42 },
      { symbol: "TSLA", regularMarketPrice: 155.2 },
    ];
    vi.mocked(get).mockResolvedValue({ quoteResponse: { result: quotes } });

    const result = await quote(["AAPL", "TSLA"]);

    expect(result).toHaveLength(2);
    expect(result[0].symbol).toBe("AAPL");
    expect(result[1].regularMarketPrice).toBe(155.2);
  });
});

describe("currentPriceInfo()", () => {
  const baseQuote: Quote = {
    symbol: "TEST",
    currency: "USD",
    shortName: "Test Inc.",
    displayName: "Test",
    marketState: "REGULAR",
    typeDisp: "Equity",
    regularMarketPrice: 100,
    regularMarketPreviousClose: 99,
    regularMarketOpen: 99.5,
    regularMarketChange: 1.0,
    regularMarketChangePercent: 1.01,
    fullExchangeName: "NasdaqGS",
    exchange: "NMS",
    fiftyTwoWeekHigh: 120,
    fiftyTwoWeekLow: 80,
  };

  it("returns regular market data for REGULAR state", () => {
    const info = currentPriceInfo(baseQuote);
    expect(info.price).toBe(100);
    expect(info.change).toBe(1.0);
    expect(info.changePercent).toBe(1.01);
  });

  it("returns pre-market data for PRE state", () => {
    const q: Quote = {
      ...baseQuote,
      marketState: "PRE",
      preMarketPrice: 101.5,
      preMarketChange: 2.5,
      preMarketChangePercent: 2.53,
    };
    const info = currentPriceInfo(q);
    expect(info.price).toBe(101.5);
    expect(info.change).toBe(2.5);
    expect(info.changePercent).toBe(2.53);
  });

  it("returns pre-market data for PREPRE state", () => {
    const q: Quote = {
      ...baseQuote,
      marketState: "PREPRE",
      preMarketPrice: 98,
      preMarketChange: -1,
      preMarketChangePercent: -1.01,
    };
    const info = currentPriceInfo(q);
    expect(info.price).toBe(98);
    expect(info.change).toBe(-1);
  });

  it("returns post-market data for POST state", () => {
    const q: Quote = {
      ...baseQuote,
      marketState: "POST",
      postMarketPrice: 102,
      postMarketChange: 3,
      postMarketChangePercent: 3.03,
    };
    const info = currentPriceInfo(q);
    expect(info.price).toBe(102);
    expect(info.change).toBe(3);
    expect(info.changePercent).toBe(3.03);
  });

  it("returns post-market data for POSTPOST state", () => {
    const q: Quote = {
      ...baseQuote,
      marketState: "POSTPOST",
      postMarketPrice: 97,
      postMarketChange: -2,
      postMarketChangePercent: -2.02,
    };
    const info = currentPriceInfo(q);
    expect(info.price).toBe(97);
    expect(info.change).toBe(-2);
  });

  it("falls back to regular data for CLOSED state", () => {
    const q: Quote = { ...baseQuote, marketState: "CLOSED" };
    const info = currentPriceInfo(q);
    expect(info.price).toBe(100);
    expect(info.change).toBe(1.0);
  });

  it("falls back to regular data when PRE state lacks pre-market fields", () => {
    const q: Quote = { ...baseQuote, marketState: "PRE" };
    const info = currentPriceInfo(q);
    expect(info.price).toBe(100);
  });

  it("falls back to regular data when POST state lacks post-market fields", () => {
    const q: Quote = { ...baseQuote, marketState: "POST" };
    const info = currentPriceInfo(q);
    expect(info.price).toBe(100);
  });
});
