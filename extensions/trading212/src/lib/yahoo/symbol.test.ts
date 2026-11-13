import { describe, expect, it, vi } from "vitest";
import type { T212Instrument } from "../t212/types";
import {
  derivedYahooSymbol,
  pickYahooSymbol,
  resolveYahooSymbol,
  searchYahooByIsin,
  yahooSuffixForT212Ticker,
  type KeyValueStore,
  type YahooQuote,
} from "./symbol";

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k) => data.get(k),
    setItem: async (k, v) => {
      data.set(k, v);
    },
  };
}

const instrument: T212Instrument = {
  ticker: "VUAAl_EQ",
  name: "Vanguard S&P 500",
  isin: "IE00BFMXXD54",
  currency: "GBX",
};

describe("yahooSuffixForT212Ticker", () => {
  it("maps known venues", () => {
    expect(yahooSuffixForT212Ticker("AAPL_US_EQ")).toBe("");
    expect(yahooSuffixForT212Ticker("VUAAl_EQ")).toBe(".L");
    expect(yahooSuffixForT212Ticker("SAPd_EQ")).toBe(".DE");
    expect(yahooSuffixForT212Ticker("VFEMa_EQ")).toBe(".AS");
    expect(yahooSuffixForT212Ticker("VUAAm_EQ")).toBe(".MI");
    expect(yahooSuffixForT212Ticker("MCp_EQ")).toBe(".PA");
  });
  it("returns null for unknown venues", () => {
    expect(yahooSuffixForT212Ticker("Xq_EQ")).toBeNull();
    expect(yahooSuffixForT212Ticker("garbage")).toBeNull();
  });
});

describe("derivedYahooSymbol", () => {
  it("builds the Yahoo symbol from the Trading 212 ticker and its venue", () => {
    expect(derivedYahooSymbol("VWCEd_EQ")).toBe("VWCE.DE");
    expect(derivedYahooSymbol("VFEMa_EQ")).toBe("VFEM.AS");
    expect(derivedYahooSymbol("VUAAm_EQ")).toBe("VUAA.MI");
    expect(derivedYahooSymbol("BPl_EQ")).toBe("BP.L");
    expect(derivedYahooSymbol("NVDA_US_EQ")).toBe("NVDA");
  });
  it("returns null for unknown venues", () => {
    expect(derivedYahooSymbol("Xq_EQ")).toBeNull();
  });
});

describe("pickYahooSymbol", () => {
  it("prefers the quote on the matching venue", () => {
    const quotes = [{ symbol: "VUAA.DE" }, { symbol: "VUAA.L" }, { symbol: "VUAA.MI" }];
    expect(pickYahooSymbol(quotes, "VUAAl_EQ")).toBe("VUAA.L");
  });
  it("picks a dot-less symbol for US tickers", () => {
    expect(pickYahooSymbol([{ symbol: "AAPL.MX" }, { symbol: "AAPL" }], "AAPL_US_EQ")).toBe("AAPL");
  });
  it("returns null when the known venue has no matching quote", () => {
    const quotes: YahooQuote[] = [{ symbol: "VUAA.DE", quoteType: "ETF" }];
    expect(pickYahooSymbol(quotes, "VUAAl_EQ")).toBeNull();
    expect(pickYahooSymbol([{ symbol: "AAPL.MX", quoteType: "EQUITY" }], "AAPL_US_EQ")).toBeNull();
  });
  it("prefers a dotless listing over other dotless symbols for US tickers", () => {
    const quotes: YahooQuote[] = [
      { symbol: "BTC-USD", quoteType: "CRYPTOCURRENCY" },
      { symbol: "EURUSD=X", quoteType: "CURRENCY" },
      { symbol: "AAPL", quoteType: "EQUITY" },
    ];
    expect(pickYahooSymbol(quotes, "AAPL_US_EQ")).toBe("AAPL");
  });
  it("falls back to the first EQUITY/ETF quote for unknown venues", () => {
    const quotes: YahooQuote[] = [
      { symbol: "X.OPT", quoteType: "OPTION" },
      { symbol: "X.PA", quoteType: "EQUITY" },
    ];
    expect(pickYahooSymbol(quotes, "Xq_EQ")).toBe("X.PA");
  });
  it("returns null when nothing matches", () => {
    expect(pickYahooSymbol([], "AAPL_US_EQ")).toBeNull();
    expect(pickYahooSymbol([{ symbol: "X.OPT", quoteType: "OPTION" }], "Xq_EQ")).toBeNull();
  });
});

/** The venue-derived symbol isn't listed, so these exercise the ISIN-search path. */
const noListing = async () => null;

describe("resolveYahooSymbol", () => {
  const vwce: T212Instrument = {
    ticker: "VWCEd_EQ",
    name: "Vanguard FTSE All-World",
    isin: "IE00BK5BQT80",
    currency: "EUR",
  };
  it("uses the venue-derived symbol when Yahoo has it in the instrument's currency", async () => {
    const store = memoryStore();
    const search = vi.fn(async () => [{ symbol: "VWRA.L", quoteType: "ETF" }]);
    const probe = vi.fn(async () => "EUR");
    expect(await resolveYahooSymbol(vwce, { search, store, probe })).toBe("VWCE.DE");
    expect(probe).toHaveBeenCalledWith("VWCE.DE");
    expect(search).not.toHaveBeenCalled();
    expect(store.data.get("yahoo-symbol:v2:VWCEd_EQ")).toBe("VWCE.DE");
  });
  it("treats pence and pounds as the same currency", async () => {
    const bp: T212Instrument = { ticker: "BPl_EQ", name: "BP", isin: "GB0007980591", currency: "GBX" };
    const probe = vi.fn(async () => "GBP");
    expect(await resolveYahooSymbol(bp, { search: vi.fn(), store: memoryStore(), probe })).toBe("BP.L");
  });
  it("falls back to the ISIN search when the derived symbol is missing or in another currency", async () => {
    const search = vi.fn(async () => [{ symbol: "VWCE.DE", quoteType: "ETF" }]);
    expect(await resolveYahooSymbol(vwce, { search, store: memoryStore(), probe: async () => null })).toBe("VWCE.DE");
    expect(await resolveYahooSymbol(vwce, { search, store: memoryStore(), probe: async () => "USD" })).toBe("VWCE.DE");
    expect(search).toHaveBeenCalledTimes(2);
  });
  it("does not cache when the probe fails", async () => {
    const store = memoryStore();
    const probe = vi.fn(async () => {
      throw new Error("offline");
    });
    await expect(resolveYahooSymbol(vwce, { search: vi.fn(), store, probe })).rejects.toThrow("offline");
    expect(store.data.size).toBe(0);
  });
  it("caches a found symbol by ticker", async () => {
    const store = memoryStore();
    const search = vi.fn(async () => [{ symbol: "VUAA.L" }]);
    expect(await resolveYahooSymbol(instrument, { search, store, probe: noListing })).toBe("VUAA.L");
    expect(await resolveYahooSymbol(instrument, { search, store, probe: noListing })).toBe("VUAA.L");
    expect(search).toHaveBeenCalledTimes(1);
    expect(store.data.get("yahoo-symbol:v2:VUAAl_EQ")).toBe("VUAA.L");
  });
  it("caches not-found as empty string and returns null without searching again", async () => {
    const store = memoryStore();
    const search = vi.fn(async () => []);
    expect(await resolveYahooSymbol(instrument, { search, store, probe: noListing })).toBeNull();
    expect(store.data.get("yahoo-symbol:v2:VUAAl_EQ")).toBe("");
    expect(await resolveYahooSymbol(instrument, { search, store, probe: noListing })).toBeNull();
    expect(search).toHaveBeenCalledTimes(1);
  });
  it("ignores mappings cached by earlier versions", async () => {
    const store = memoryStore();
    store.data.set("yahoo-symbol:IE00BFMXXD54", "VDEM.L");
    const search = vi.fn(async () => [{ symbol: "VUAA.L" }]);
    expect(await resolveYahooSymbol(instrument, { search, store, probe: noListing })).toBe("VUAA.L");
  });
  it("does not cache when search throws", async () => {
    const store = memoryStore();
    const search = vi.fn(async () => {
      throw new Error("boom");
    });
    await expect(resolveYahooSymbol(instrument, { search, store, probe: noListing })).rejects.toThrow("boom");
    expect(store.data.size).toBe(0);
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

describe("searchYahooByIsin", () => {
  it("requests the search endpoint with a User-Agent and returns quotes", async () => {
    const fetchFn = vi.fn(
      async () => new Response(JSON.stringify({ quotes: [{ symbol: "VUAA.L", exchange: "LSE", quoteType: "ETF" }] })),
    );
    const quotes = await searchYahooByIsin("IE00BFMXXD54", fetchFn as unknown as typeof fetch);
    expect(quotes).toEqual([{ symbol: "VUAA.L", exchange: "LSE", quoteType: "ETF" }]);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://query2.finance.yahoo.com/v1/finance/search?q=IE00BFMXXD54&quotesCount=10&newsCount=0");
    expect((init.headers as Record<string, string>)["User-Agent"]).toContain("Mozilla/5.0");
  });
  it("throws with the status on non-2xx", async () => {
    const fetchFn = vi.fn(async () => new Response("no", { status: 429 }));
    await expect(searchYahooByIsin("X", fetchFn as unknown as typeof fetch)).rejects.toThrow("429");
  });
  it("gives up on a request that doesn't answer in time", { timeout: 1000 }, async () => {
    const fetchFn = hangingFetch();
    await expect(searchYahooByIsin("X", fetchFn as unknown as typeof fetch, 20)).rejects.toThrow();
  });
});
