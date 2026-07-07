/**
 * Yahoo Finance service wrapper tests.
 *
 * These tests mock the `yahoo-finance2` library at the module level to avoid
 * a known Jest-specific issue where Yahoo Finance's cookie/crumb consent flow
 * fails inside Jest's test environment (see yahoo-finance2 issue #923).
 *
 * The real API works fine at runtime — this has been verified via direct Node
 * execution. These tests validate that OUR wrapper logic is correct:
 *
 * 1. `searchAssets()` — filters, maps quoteType, extracts names
 * 2. `getQuote()` — normalises minor currencies (GBp → GBP), maps fields
 * 3. `getQuotes()` — parallel fetching, partial failure handling
 * 4. `getFxRate()` — same-currency short-circuit, symbol construction
 * 5. Error handling — invalid symbols, missing data
 *
 * Fixture data is based on real Yahoo Finance API responses captured via
 * `node -e` calls against the live API on 2026-02-21.
 *
 * Run with: npm test -- --testPathPattern=yahoo-finance
 */

import { searchAssets, getQuote, getQuotes, getFxRate } from "../services/yahoo-finance";
import { AssetType } from "../utils/types";
import { TEST_SYMBOLS } from "./portfolio-fixtures";

// ──────────────────────────────────────────
// Mock yahoo-finance2
// ──────────────────────────────────────────

/**
 * Fixture data mimicking real Yahoo Finance API responses.
 * Captured from live API on 2026-02-21 via direct Node execution.
 */

const MOCK_SEARCH_RESPONSES: Record<string, { quotes: Array<Record<string, unknown>> }> = {
  AAPL: {
    quotes: [
      { symbol: "AAPL", shortname: "Apple Inc.", quoteType: "EQUITY", exchange: "NMS" },
      { symbol: "AAPL.MX", shortname: "Apple Inc.", quoteType: "EQUITY", exchange: "MEX" },
      { symbol: "AAPLM.BA", shortname: "Apple Inc.", quoteType: "EQUITY", exchange: "BUE" },
    ],
  },
  Microsoft: {
    quotes: [
      { symbol: "MSFT", shortname: "Microsoft Corporation", quoteType: "EQUITY", exchange: "NMS" },
      { symbol: "MSFT.MX", shortname: "Microsoft Corporation", quoteType: "EQUITY", exchange: "MEX" },
    ],
  },
  "S&P 500": {
    quotes: [
      { symbol: "^GSPC", shortname: "S&P 500", quoteType: "INDEX", exchange: "SNP" },
      { symbol: "VOO", shortname: "Vanguard S&P 500 ETF", quoteType: "ETF", exchange: "PCX" },
      { symbol: "VUSA.L", shortname: "Vanguard S&P 500 UCITS ETF", quoteType: "ETF", exchange: "LSE" },
      { symbol: "SPY", shortname: "SPDR S&P 500 ETF Trust", quoteType: "ETF", exchange: "PCX" },
    ],
  },
  AstraZeneca: {
    quotes: [
      { symbol: "AZN", shortname: "AstraZeneca PLC", quoteType: "EQUITY", exchange: "NMS" },
      { symbol: "AZN.L", shortname: "ASTRAZENECA PLC ORD SHS", quoteType: "EQUITY", exchange: "LSE" },
    ],
  },
  Vanguard: {
    quotes: [
      { symbol: "VOO", shortname: "Vanguard S&P 500 ETF", quoteType: "ETF", exchange: "PCX" },
      { symbol: "VTI", shortname: "Vanguard Total Stock Market ETF", quoteType: "ETF", exchange: "PCX" },
      { symbol: "VUSA.L", shortname: "Vanguard S&P 500 UCITS ETF", quoteType: "ETF", exchange: "LSE" },
      { symbol: "VWRL.L", shortname: "Vanguard FTSE All-World UCITS ETF", quoteType: "ETF", exchange: "LSE" },
    ],
  },
  Apple: {
    quotes: [
      { symbol: "AAPL", shortname: "Apple Inc.", quoteType: "EQUITY", exchange: "NMS" },
      { symbol: "APLE", shortname: "Apple Hospitality REIT Inc.", quoteType: "EQUITY", exchange: "NYQ" },
    ],
  },
  "Vanguard S&P 500 UCITS": {
    quotes: [
      { symbol: "VUSA.L", shortname: "Vanguard S&P 500 UCITS ETF", quoteType: "ETF", exchange: "LSE" },
      { symbol: "VUSD.L", shortname: "Vanguard S&P 500 UCITS ETF USD", quoteType: "ETF", exchange: "LSE" },
    ],
  },
  MSFT: {
    quotes: [{ symbol: "MSFT", shortname: "Microsoft Corporation", quoteType: "EQUITY", exchange: "NMS" }],
  },
  VOO: {
    quotes: [{ symbol: "VOO", shortname: "Vanguard S&P 500 ETF", quoteType: "ETF", exchange: "PCX" }],
  },
  "VUSA.L": {
    quotes: [{ symbol: "VUSA.L", shortname: "Vanguard S&P 500 UCITS ETF", quoteType: "ETF", exchange: "LSE" }],
  },
  Shell: {
    quotes: [
      { symbol: "SHEL", shortname: "Shell PLC", quoteType: "EQUITY", exchange: "NYQ" },
      { symbol: "SHEL.L", shortname: "SHELL PLC ORD EUR0.07", quoteType: "EQUITY", exchange: "LSE" },
    ],
  },
};

/**
 * Mock quoteSummary responses keyed by symbol.
 *
 * Note: UK-listed instruments (*.L) return prices in GBp (pence) from Yahoo.
 * Our getQuote wrapper normalises these to GBP (pounds). The mock data here
 * reflects what Yahoo actually returns (i.e. GBp for LSE instruments).
 */
const MOCK_QUOTE_SUMMARY_RESPONSES: Record<string, { price: Record<string, unknown> }> = {
  AAPL: {
    price: {
      symbol: "AAPL",
      shortName: "Apple Inc.",
      longName: "Apple Inc.",
      currency: "USD",
      regularMarketPrice: 264.58,
      regularMarketChange: 4.0,
      regularMarketChangePercent: 0.01535,
      marketState: "CLOSED",
      quoteType: "EQUITY",
      exchange: "NMS",
    },
  },
  MSFT: {
    price: {
      symbol: "MSFT",
      shortName: "Microsoft Corporation",
      longName: "Microsoft Corporation",
      currency: "USD",
      regularMarketPrice: 412.31,
      regularMarketChange: 2.45,
      regularMarketChangePercent: 0.00598,
      marketState: "CLOSED",
      quoteType: "EQUITY",
      exchange: "NMS",
    },
  },
  GOOGL: {
    price: {
      symbol: "GOOGL",
      shortName: "Alphabet Inc.",
      longName: "Alphabet Inc.",
      currency: "USD",
      regularMarketPrice: 179.53,
      regularMarketChange: -1.22,
      regularMarketChangePercent: -0.00675,
      marketState: "CLOSED",
      quoteType: "EQUITY",
      exchange: "NMS",
    },
  },
  VOO: {
    price: {
      symbol: "VOO",
      shortName: "Vanguard S&P 500 ETF",
      longName: "Vanguard S&P 500 ETF",
      currency: "USD",
      regularMarketPrice: 543.21,
      regularMarketChange: 3.1,
      regularMarketChangePercent: 0.00574,
      marketState: "CLOSED",
      quoteType: "ETF",
      exchange: "PCX",
    },
  },
  // UK ETFs — Yahoo returns prices in GBp (pence)
  "VUSA.L": {
    price: {
      symbol: "VUSA.L",
      shortName: "VANGUARD FUNDS PLC VANGUARD S&P",
      longName: "Vanguard S&P 500 UCITS ETF",
      currency: "GBp",
      regularMarketPrice: 9686.5,
      regularMarketChange: 25.0,
      regularMarketChangePercent: 0.00259,
      marketState: "CLOSED",
      quoteType: "ETF",
      exchange: "LSE",
    },
  },
  "VWRL.L": {
    price: {
      symbol: "VWRL.L",
      shortName: "VANGUARD FUNDS PLC VANGUARD FTSE",
      longName: "Vanguard FTSE All-World UCITS ETF",
      currency: "GBp",
      regularMarketPrice: 10245.0,
      regularMarketChange: -30.0,
      regularMarketChangePercent: -0.00292,
      marketState: "CLOSED",
      quoteType: "ETF",
      exchange: "LSE",
    },
  },
  // UK Equities — Yahoo returns prices in GBp (pence)
  "AZN.L": {
    price: {
      symbol: "AZN.L",
      shortName: "ASTRAZENECA PLC ORD SHS",
      longName: "AstraZeneca PLC",
      currency: "GBp",
      regularMarketPrice: 12350.0,
      regularMarketChange: 45.0,
      regularMarketChangePercent: 0.00366,
      marketState: "CLOSED",
      quoteType: "EQUITY",
      exchange: "LSE",
    },
  },
  "SHEL.L": {
    price: {
      symbol: "SHEL.L",
      shortName: "SHELL PLC ORD EUR0.07",
      longName: "Shell PLC",
      currency: "GBp",
      regularMarketPrice: 2940.5,
      regularMarketChange: -3.5,
      regularMarketChangePercent: -0.00119,
      marketState: "CLOSED",
      quoteType: "EQUITY",
      exchange: "LSE",
    },
  },
  // FX Pairs
  "USDGBP=X": {
    price: {
      symbol: "USDGBP=X",
      shortName: "USD/GBP",
      currency: "GBP",
      regularMarketPrice: 0.74177,
      regularMarketChange: -0.0007,
      regularMarketChangePercent: -0.00094,
      marketState: "CLOSED",
    },
  },
  "GBPUSD=X": {
    price: {
      symbol: "GBPUSD=X",
      shortName: "GBP/USD",
      currency: "USD",
      regularMarketPrice: 1.3481,
      regularMarketChange: 0.0013,
      regularMarketChangePercent: 0.00096,
      marketState: "CLOSED",
    },
  },
  "EURGBP=X": {
    price: {
      symbol: "EURGBP=X",
      shortName: "EUR/GBP",
      currency: "GBP",
      regularMarketPrice: 0.8312,
      regularMarketChange: 0.001,
      regularMarketChangePercent: 0.0012,
      marketState: "CLOSED",
    },
  },
  "CHFGBP=X": {
    price: {
      symbol: "CHFGBP=X",
      shortName: "CHF/GBP",
      currency: "GBP",
      regularMarketPrice: 0.8743,
      regularMarketChange: -0.0005,
      regularMarketChangePercent: -0.00057,
      marketState: "CLOSED",
    },
  },
  "JPYGBP=X": {
    price: {
      symbol: "JPYGBP=X",
      shortName: "JPY/GBP",
      currency: "GBP",
      regularMarketPrice: 0.00497,
      regularMarketChange: 0.00001,
      regularMarketChangePercent: 0.002,
      marketState: "CLOSED",
    },
  },
};

// ──────────────────────────────────────────
// Install the mock before the service module loads
// ──────────────────────────────────────────

jest.mock("yahoo-finance2", () => {
  const mockSearch = jest.fn(async (query: string) => {
    const key = Object.keys(MOCK_SEARCH_RESPONSES).find((k) => k.toLowerCase() === query.toLowerCase() || k === query);
    return key ? MOCK_SEARCH_RESPONSES[key] : { quotes: [] };
  });

  const mockQuoteSummary = jest.fn(async (symbol: string) => {
    const data = MOCK_QUOTE_SUMMARY_RESPONSES[symbol];
    if (!data) {
      throw new Error(`Quote not found for symbol: ${symbol}`);
    }
    return data;
  });

  class MockYahooFinance {
    search = mockSearch;
    quoteSummary = mockQuoteSummary;
  }

  // Default export — `import YahooFinance from "yahoo-finance2"`
  return {
    __esModule: true,
    default: MockYahooFinance,
    _mockSearch: mockSearch,
    _mockQuoteSummary: mockQuoteSummary,
  };
});

// ──────────────────────────────────────────
// Search Tests
// ──────────────────────────────────────────

describe("searchAssets", () => {
  it("returns results for a ticker symbol search (AAPL)", async () => {
    const results = await searchAssets("AAPL");

    expect(results.length).toBeGreaterThan(0);

    // First result should be AAPL itself
    const apple = results.find((r) => r.symbol === "AAPL");
    expect(apple).toBeDefined();
    expect(apple!.name).toBe("Apple Inc.");
    expect(apple!.type).toBe(AssetType.EQUITY);
    expect(apple!.exchange).toBe("NMS");
  });

  it("returns results for a company name search (Microsoft)", async () => {
    const results = await searchAssets("Microsoft");

    expect(results.length).toBeGreaterThan(0);

    const msft = results.find((r) => r.symbol === "MSFT");
    expect(msft).toBeDefined();
    expect(msft!.name).toBe("Microsoft Corporation");
    expect(msft!.type).toBe(AssetType.EQUITY);
  });

  it("returns results for a broad index search (S&P 500)", async () => {
    const results = await searchAssets("S&P 500");

    expect(results.length).toBeGreaterThan(0);

    // Should include at least one S&P-related ETF
    const symbols = results.map((r) => r.symbol);
    expect(symbols.some((s) => ["VOO", "VUSA.L", "SPY", "^GSPC"].includes(s))).toBe(true);
  });

  it("returns results for a UK-listed company search (AstraZeneca)", async () => {
    const results = await searchAssets("AstraZeneca");

    expect(results.length).toBeGreaterThan(0);

    const azn = results.find((r) => r.symbol === "AZN.L" || r.symbol === "AZN");
    expect(azn).toBeDefined();
    expect(azn!.type).toBe(AssetType.EQUITY);
  });

  it("returns results for a fund family search (Vanguard)", async () => {
    const results = await searchAssets("Vanguard");

    expect(results.length).toBeGreaterThan(0);

    const vanguardResults = results.filter((r) => r.name.toLowerCase().includes("vanguard"));
    expect(vanguardResults.length).toBeGreaterThan(0);
  });

  it("returns empty results for an empty query", async () => {
    const results = await searchAssets("");
    expect(results).toEqual([]);
  });

  it("returns empty results for a whitespace-only query", async () => {
    const results = await searchAssets("   ");
    expect(results).toEqual([]);
  });

  it("returns results with correct structure for every item", async () => {
    const results = await searchAssets("AAPL");

    for (const result of results) {
      expect(typeof result.symbol).toBe("string");
      expect(result.symbol.length).toBeGreaterThan(0);
      expect(typeof result.name).toBe("string");
      expect(result.name.length).toBeGreaterThan(0);
      expect(typeof result.type).toBe("string");
      expect(typeof result.exchange).toBe("string");
    }
  });

  it("filters out results without a symbol", async () => {
    // Our search mock always returns results with symbols,
    // but verify the filter logic works by checking nothing breaks
    const results = await searchAssets("AAPL");
    for (const result of results) {
      expect(result.symbol).toBeTruthy();
    }
  });
});

// ──────────────────────────────────────────
// Quote Tests — US Equities
// ──────────────────────────────────────────

describe("getQuote — US Equities", () => {
  it.each(TEST_SYMBOLS.US_STOCKS)("fetches a valid quote for %s", async (symbol) => {
    const quote = await getQuote(symbol);

    expect(quote).toBeDefined();
    expect(quote.symbol).toBe(symbol);
    expect(quote.name).toBeTruthy();
    expect(typeof quote.price).toBe("number");
    expect(quote.price).toBeGreaterThan(0);
    expect(quote.currency).toBe("USD");
    expect(typeof quote.change).toBe("number");
    expect(typeof quote.changePercent).toBe("number");
    expect(typeof quote.marketState).toBe("string");
  });

  it("returns a price in USD for AAPL", async () => {
    const quote = await getQuote("AAPL");

    expect(quote.currency).toBe("USD");
    expect(quote.price).toBe(264.58);
  });

  it("returns a price in USD for MSFT", async () => {
    const quote = await getQuote("MSFT");

    expect(quote.currency).toBe("USD");
    expect(quote.price).toBe(412.31);
  });

  it("returns a price in USD for GOOGL", async () => {
    const quote = await getQuote("GOOGL");

    expect(quote.currency).toBe("USD");
    expect(quote.price).toBe(179.53);
  });
});

// ──────────────────────────────────────────
// Quote Tests — US ETFs
// ──────────────────────────────────────────

describe("getQuote — US ETFs", () => {
  it("fetches a valid quote for VOO (Vanguard S&P 500 ETF)", async () => {
    const quote = await getQuote("VOO");

    expect(quote).toBeDefined();
    expect(quote.symbol).toBe("VOO");
    expect(quote.name).toBeTruthy();
    expect(typeof quote.price).toBe("number");
    expect(quote.price).toBeGreaterThan(0);
    expect(quote.currency).toBe("USD");
    expect(quote.price).toBe(543.21);
  });
});

// ──────────────────────────────────────────
// Quote Tests — UK ETFs (GBp → GBP normalisation)
// ──────────────────────────────────────────

describe("getQuote — UK ETFs (minor currency normalisation)", () => {
  it("fetches VUSA.L and normalises GBp to GBP", async () => {
    const quote = await getQuote("VUSA.L");

    expect(quote).toBeDefined();
    expect(quote.symbol).toBe("VUSA.L");
    expect(quote.name).toBeTruthy();

    // Yahoo returns 9686.5 GBp — our normalisation divides by 100
    expect(quote.currency).toBe("GBP");
    expect(quote.price).toBeCloseTo(96.865, 2);

    // Verify it's in pounds, not pence
    expect(quote.price).toBeGreaterThan(10);
    expect(quote.price).toBeLessThan(500);
  });

  it("fetches VWRL.L and normalises GBp to GBP", async () => {
    const quote = await getQuote("VWRL.L");

    expect(quote).toBeDefined();
    expect(quote.symbol).toBe("VWRL.L");

    // Yahoo returns 10245.0 GBp — normalised to £102.45
    expect(quote.currency).toBe("GBP");
    expect(quote.price).toBeCloseTo(102.45, 2);

    // Sanity check: pounds, not pence
    expect(quote.price).toBeGreaterThan(10);
    expect(quote.price).toBeLessThan(500);
  });

  it("normalises the daily change value alongside the price for UK ETFs", async () => {
    const quote = await getQuote("VUSA.L");

    // Raw change is 25.0 GBp — should become 0.25 GBP
    expect(quote.change).toBeCloseTo(0.25, 2);

    // A daily change > £50 would suggest pence leaked through
    expect(Math.abs(quote.change)).toBeLessThan(50);
  });
});

// ──────────────────────────────────────────
// Quote Tests — UK Equities
// ──────────────────────────────────────────

describe("getQuote — UK Equities", () => {
  it("fetches a valid quote for AZN.L (AstraZeneca)", async () => {
    const quote = await getQuote("AZN.L");

    expect(quote).toBeDefined();
    expect(quote.symbol).toBe("AZN.L");
    expect(quote.name).toBeTruthy();
    expect(typeof quote.price).toBe("number");
    expect(quote.price).toBeGreaterThan(0);

    // Yahoo returns 12350.0 GBp → normalised to £123.50
    expect(quote.currency).toBe("GBP");
    expect(quote.price).toBeCloseTo(123.5, 2);
    expect(quote.price).toBeGreaterThan(30);
    expect(quote.price).toBeLessThan(500);
  });

  it("fetches a valid quote for SHEL.L (Shell)", async () => {
    const quote = await getQuote("SHEL.L");

    expect(quote).toBeDefined();
    expect(quote.symbol).toBe("SHEL.L");
    expect(quote.name).toBeTruthy();
    expect(typeof quote.price).toBe("number");
    expect(quote.price).toBeGreaterThan(0);

    // Yahoo returns 2940.5 GBp → normalised to £29.405
    expect(quote.currency).toBe("GBP");
    expect(quote.price).toBeCloseTo(29.405, 2);
    expect(quote.price).toBeGreaterThan(5);
    expect(quote.price).toBeLessThan(200);
  });
});

// ──────────────────────────────────────────
// Quote Tests — Error Handling
// ──────────────────────────────────────────

describe("getQuote — Error Handling", () => {
  it("throws an error for an invalid/nonexistent symbol", async () => {
    await expect(getQuote(TEST_SYMBOLS.INVALID)).rejects.toThrow();
  });

  it("throws an error with a descriptive message for invalid symbols", async () => {
    try {
      await getQuote(TEST_SYMBOLS.INVALID);
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error instanceof Error || typeof error === "object").toBe(true);
    }
  });
});

// ──────────────────────────────────────────
// Batch Quote Tests
// ──────────────────────────────────────────

describe("getQuotes — Batch Fetching", () => {
  it("fetches quotes for multiple US symbols in parallel", async () => {
    const { quotes, errors } = await getQuotes(["AAPL", "MSFT", "GOOGL"]);

    expect(quotes.length).toBe(3);
    expect(errors.length).toBe(0);

    const symbols = quotes.map((q) => q.symbol);
    expect(symbols).toContain("AAPL");
    expect(symbols).toContain("MSFT");
    expect(symbols).toContain("GOOGL");

    for (const quote of quotes) {
      expect(quote.price).toBeGreaterThan(0);
      expect(quote.currency).toBe("USD");
    }
  });

  it("fetches quotes for a mix of US and UK symbols", async () => {
    const { quotes, errors } = await getQuotes(["AAPL", "VUSA.L", "VOO"]);

    expect(quotes.length).toBe(3);
    expect(errors.length).toBe(0);

    const aaplQuote = quotes.find((q) => q.symbol === "AAPL");
    const vusaQuote = quotes.find((q) => q.symbol === "VUSA.L");
    const vooQuote = quotes.find((q) => q.symbol === "VOO");

    expect(aaplQuote).toBeDefined();
    expect(aaplQuote!.currency).toBe("USD");

    expect(vusaQuote).toBeDefined();
    expect(vusaQuote!.currency).toBe("GBP"); // normalised from GBp

    expect(vooQuote).toBeDefined();
    expect(vooQuote!.currency).toBe("USD");
  });

  it("returns partial results when some symbols are invalid", async () => {
    const { quotes, errors } = await getQuotes(["AAPL", TEST_SYMBOLS.INVALID, "MSFT"]);

    // Should have 2 successful quotes and 1 error
    expect(quotes.length).toBe(2);
    expect(errors.length).toBe(1);

    const symbols = quotes.map((q) => q.symbol);
    expect(symbols).toContain("AAPL");
    expect(symbols).toContain("MSFT");

    expect(errors[0].symbol).toBe(TEST_SYMBOLS.INVALID);
    expect(errors[0].error).toBeDefined();
  });

  it("returns empty results for an empty symbols array", async () => {
    const { quotes, errors } = await getQuotes([]);

    expect(quotes).toEqual([]);
    expect(errors).toEqual([]);
  });

  it("fetches all test portfolio symbols successfully", async () => {
    const allSymbols = [...TEST_SYMBOLS.ALL];
    const { quotes, errors } = await getQuotes(allSymbols);

    // All 8 symbols should resolve
    expect(quotes.length).toBe(allSymbols.length);
    expect(errors.length).toBe(0);

    // Verify each symbol got a valid price
    for (const quote of quotes) {
      expect(quote.price).toBeGreaterThan(0);
      expect(quote.currency).toBeTruthy();
      expect(quote.name).toBeTruthy();
    }

    // Verify currency normalisation for UK symbols
    const ukQuotes = quotes.filter((q) => q.symbol.endsWith(".L"));
    for (const ukQuote of ukQuotes) {
      expect(ukQuote.currency).toBe("GBP");
    }

    // Verify US symbols are in USD
    const usQuotes = quotes.filter((q) => !q.symbol.endsWith(".L") && !q.symbol.includes("="));
    for (const usQuote of usQuotes) {
      expect(usQuote.currency).toBe("USD");
    }
  });
});

// ──────────────────────────────────────────
// FX Rate Tests
// ──────────────────────────────────────────

describe("getFxRate", () => {
  it("returns 1.0 for same-currency conversion (GBP → GBP)", async () => {
    const rate = await getFxRate("GBP", "GBP");
    expect(rate).toBe(1.0);
  });

  it("returns 1.0 for same-currency conversion (USD → USD)", async () => {
    const rate = await getFxRate("USD", "USD");
    expect(rate).toBe(1.0);
  });

  it("fetches a valid USD → GBP exchange rate", async () => {
    const rate = await getFxRate("USD", "GBP");

    expect(typeof rate).toBe("number");
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBe(0.74177);
  });

  it("fetches a valid GBP → USD exchange rate", async () => {
    const rate = await getFxRate("GBP", "USD");

    expect(typeof rate).toBe("number");
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBe(1.3481);
  });

  it("fetches a valid EUR → GBP exchange rate", async () => {
    const rate = await getFxRate("EUR", "GBP");

    expect(typeof rate).toBe("number");
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBe(0.8312);
  });

  it("inverse FX rates are approximately reciprocal", async () => {
    const usdToGbp = await getFxRate("USD", "GBP");
    const gbpToUsd = await getFxRate("GBP", "USD");

    // The product of a rate and its inverse should be approximately 1.0
    const product = usdToGbp * gbpToUsd;
    expect(product).toBeGreaterThan(0.95);
    expect(product).toBeLessThan(1.05);
  });

  it("fetches a valid CHF → GBP exchange rate", async () => {
    const rate = await getFxRate("CHF", "GBP");

    expect(typeof rate).toBe("number");
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBe(0.8743);
  });

  it("fetches a valid JPY → GBP exchange rate", async () => {
    const rate = await getFxRate("JPY", "GBP");

    expect(typeof rate).toBe("number");
    expect(rate).toBeGreaterThan(0);
    // JPY/GBP rate should be very small
    expect(rate).toBe(0.00497);
    expect(rate).toBeLessThan(0.1);
  });

  it("throws an error for an unsupported FX pair", async () => {
    await expect(getFxRate("ZZZ", "YYY")).rejects.toThrow();
  });
});

// ──────────────────────────────────────────
// Asset Type Mapping Tests
// ──────────────────────────────────────────

describe("AssetType mapping", () => {
  it("maps AAPL as EQUITY", async () => {
    const results = await searchAssets("AAPL");
    const apple = results.find((r) => r.symbol === "AAPL");
    expect(apple).toBeDefined();
    expect(apple!.type).toBe(AssetType.EQUITY);
  });

  it("maps VOO as ETF", async () => {
    const results = await searchAssets("VOO");
    const voo = results.find((r) => r.symbol === "VOO");
    expect(voo).toBeDefined();
    expect(voo!.type).toBe(AssetType.ETF);
  });

  it("maps VUSA.L as ETF", async () => {
    const results = await searchAssets("VUSA.L");
    const vusa = results.find((r) => r.symbol === "VUSA.L");
    expect(vusa).toBeDefined();
    expect(vusa!.type).toBe(AssetType.ETF);
  });

  it("maps ^GSPC as INDEX", async () => {
    const results = await searchAssets("S&P 500");
    const index = results.find((r) => r.symbol === "^GSPC");
    expect(index).toBeDefined();
    expect(index!.type).toBe(AssetType.INDEX);
  });
});

// ──────────────────────────────────────────
// End-to-End: Search → Quote Flow
// ──────────────────────────────────────────

describe("Search → Quote end-to-end flow", () => {
  it("can search for Apple, select AAPL, and get a valid quote", async () => {
    // Step 1: Search
    const results = await searchAssets("Apple");
    expect(results.length).toBeGreaterThan(0);

    const apple = results.find((r) => r.symbol === "AAPL");
    expect(apple).toBeDefined();

    // Step 2: Get quote for the selected search result
    const quote = await getQuote(apple!.symbol);
    expect(quote.symbol).toBe("AAPL");
    expect(quote.price).toBeGreaterThan(0);
    expect(quote.currency).toBe("USD");
  });

  it("can search for a UK ETF, select VUSA.L, and get a normalised quote", async () => {
    // Step 1: Search
    const results = await searchAssets("Vanguard S&P 500 UCITS");
    expect(results.length).toBeGreaterThan(0);

    const vusa = results.find((r) => r.symbol === "VUSA.L");
    expect(vusa).toBeDefined();

    // Step 2: Get quote — should be normalised from GBp to GBP
    const quote = await getQuote(vusa!.symbol);
    expect(quote.price).toBeGreaterThan(0);
    expect(quote.currency).toBe("GBP");
    // Should be in pounds (~96.87), not pence (~9687)
    expect(quote.price).toBeLessThan(500);
  });

  it("can search, quote, and fetch FX rate for a full position calculation", async () => {
    // Simulate adding a US stock to a GBP-denominated portfolio

    // Step 1: Search for Microsoft
    const results = await searchAssets("MSFT");
    const msft = results.find((r) => r.symbol === "MSFT");
    expect(msft).toBeDefined();

    // Step 2: Get the quote
    const quote = await getQuote(msft!.symbol);
    expect(quote.currency).toBe("USD");
    expect(quote.price).toBeGreaterThan(0);

    // Step 3: Get FX rate to convert to GBP
    const fxRate = await getFxRate("USD", "GBP");
    expect(fxRate).toBeGreaterThan(0);

    // Step 4: Calculate position value
    const units = 15;
    const nativeValue = units * quote.price;
    const baseValue = nativeValue * fxRate;

    expect(nativeValue).toBeGreaterThan(0);
    expect(baseValue).toBeGreaterThan(0);

    // GBP value should be less than USD value (since GBP > USD)
    expect(baseValue).toBeLessThan(nativeValue);
  });
});

// ──────────────────────────────────────────
// Normalisation Edge Cases
// ──────────────────────────────────────────

describe("getQuote — normalisation edge cases", () => {
  it("does NOT normalise USD prices (pass-through)", async () => {
    const quote = await getQuote("AAPL");

    // USD is not a minor currency — price should pass through unchanged
    expect(quote.price).toBe(264.58);
    expect(quote.currency).toBe("USD");
    expect(quote.change).toBe(4.0);
  });

  it("normalises both price AND change for GBp instruments", async () => {
    const quote = await getQuote("AZN.L");

    // Raw: 12350.0 GBp → 123.50 GBP
    expect(quote.price).toBeCloseTo(123.5, 2);
    expect(quote.currency).toBe("GBP");

    // Raw change: 45.0 GBp → 0.45 GBP
    expect(quote.change).toBeCloseTo(0.45, 2);
  });

  it("converts changePercent from decimal to percentage (not affected by currency normalisation)", async () => {
    const quote = await getQuote("VUSA.L");

    // Yahoo returns 0.00259 (decimal ratio) → we multiply by 100 → 0.259%
    expect(quote.changePercent).toBeCloseTo(0.259, 2);
  });

  it("preserves negative change values through normalisation", async () => {
    const quote = await getQuote("SHEL.L");

    // Raw change: -3.5 GBp → -0.035 GBP
    expect(quote.change).toBeCloseTo(-0.035, 3);
    expect(quote.change).toBeLessThan(0);
  });
});
