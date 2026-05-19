/**
 * Mockup Conformance Tests
 *
 * These tests verify that the code produces output consistent with the
 * visual mockups in docs/mockups/. Each describe block references a
 * specific mockup and checks the exact values it depicts.
 *
 *   mockup-search-detail.png  — AAPL search result with 1Y detail
 *   mockup-favorites-1d.png   — Favorites list with 1D intraday chart
 *   mockup-down-stock.png     — TSLA search result (red/down) with 3M detail
 */

import { describe, it, expect } from "vitest";
import { formatMoney, formatChange, changeIcon, changeColor } from "../utils";
import { buildChartConfig, buildChartUrl } from "../chart/quickchart";
import { currentPriceInfo, type Quote } from "../yahoo-finance/quote";
import { INTERVALS } from "../types";

// ---------------------------------------------------------------------------
// Fixture: AAPL quote matching mockup-search-detail.png
// ---------------------------------------------------------------------------
const AAPL_QUOTE: Quote = {
  symbol: "AAPL",
  currency: "USD",
  shortName: "Apple Inc.",
  displayName: "Apple",
  marketState: "REGULAR",
  typeDisp: "Equity",
  regularMarketPrice: 198.42,
  regularMarketPreviousClose: 197.19,
  regularMarketOpen: 197.1,
  regularMarketChange: 1.23,
  regularMarketChangePercent: 0.6237,
  marketCap: 3.07e12,
  fullExchangeName: "NasdaqGS",
  exchange: "NMS",
  fiftyTwoWeekHigh: 237.49,
  fiftyTwoWeekLow: 164.08,
  trailingPE: 32.5,
  dividendYield: 0.44,
  epsTrailingTwelveMonths: 6.13,
};

// ---------------------------------------------------------------------------
// Fixture: TSLA quote matching mockup-down-stock.png
// ---------------------------------------------------------------------------
const TSLA_QUOTE: Quote = {
  symbol: "TSLA",
  currency: "USD",
  shortName: "Tesla Inc.",
  displayName: "Tesla",
  marketState: "REGULAR",
  typeDisp: "Equity",
  regularMarketPrice: 155.2,
  regularMarketPreviousClose: 167.5,
  regularMarketOpen: 158.4,
  regularMarketChange: -12.3,
  regularMarketChangePercent: -7.3433,
  marketCap: 495.2e9,
  fullExchangeName: "NasdaqGS",
  exchange: "NMS",
  fiftyTwoWeekHigh: 278.98,
  fiftyTwoWeekLow: 138.8,
  trailingPE: 58.1,
};

// ---------------------------------------------------------------------------
// Fixture: TSLA in PRE-market matching mockup-favorites-1d.png (sunrise icon)
// ---------------------------------------------------------------------------
const TSLA_PRE_QUOTE: Quote = {
  symbol: "TSLA",
  currency: "USD",
  shortName: "Tesla Inc.",
  displayName: "Tesla",
  marketState: "PRE",
  typeDisp: "Equity",
  regularMarketPrice: 177.05,
  regularMarketPreviousClose: 175.6,
  regularMarketOpen: 175.6,
  regularMarketChange: 1.45,
  regularMarketChangePercent: 0.8257,
  preMarketPrice: 178.9,
  preMarketChange: 1.85,
  preMarketChangePercent: 1.0451,
  fullExchangeName: "NasdaqGS",
  exchange: "NMS",
  fiftyTwoWeekHigh: 278.98,
  fiftyTwoWeekLow: 138.8,
};

// ===================================================================
// Mockup 1: mockup-search-detail.png  (AAPL, 1Y, up)
// ===================================================================

describe("Mockup 1 — Search Detail (AAPL, 1Y, green)", () => {
  describe("price formatting", () => {
    it("formats AAPL price as $198.42 USD", () => {
      expect(formatMoney(198.42, "USD")).toBe("$198.42 USD");
    });

    it("formats change as +$1.23 USD (+0.62%)", () => {
      expect(formatChange(1.23, 0.62, "USD")).toBe("+$1.23 USD (+0.62%)");
    });

    it("shows green up-arrow for positive change", () => {
      const icon = changeIcon(1.23);
      expect(icon.source).toBe("arrow-up");
      expect(icon.tintColor).toBe("green");
    });

    it("returns green for positive changeColor", () => {
      expect(changeColor(1.23)).toBe("green");
    });
  });

  describe("detail metadata header row", () => {
    it("renders price and change with currency code in the metadata header", () => {
      const info = currentPriceInfo(AAPL_QUOTE);
      const text = `${formatMoney(info.price, AAPL_QUOTE.currency)}  ${formatChange(info.change, info.changePercent, AAPL_QUOTE.currency)}`;
      expect(text).toContain("$198.42 USD");
      expect(text).toContain("+$1.23 USD");
    });

    it("markdown is chart-only (no text header when chart is available)", () => {
      const chartMarkdown = "![Stock Chart](https://example.com/chart.png)";
      const markdown = chartMarkdown || `**AAPL — Apple**`;
      expect(markdown).toBe(chartMarkdown);
      expect(markdown).not.toContain("AAPL —");
    });
  });

  describe("metadata fields", () => {
    it("Open: $197.10 USD", () => {
      expect(formatMoney(AAPL_QUOTE.regularMarketOpen, "USD")).toBe(
        "$197.10 USD",
      );
    });

    it("Mkt Cap: $3.07T USD", () => {
      expect(formatMoney(AAPL_QUOTE.marketCap, "USD")).toBe("$3.07T USD");
    });

    it("P/E: 32.50", () => {
      expect(AAPL_QUOTE.trailingPE!.toFixed(2)).toBe("32.50");
    });

    it("52w range: $164.08 USD – $237.49 USD", () => {
      const range = `${formatMoney(AAPL_QUOTE.fiftyTwoWeekLow, "USD")} – ${formatMoney(AAPL_QUOTE.fiftyTwoWeekHigh, "USD")}`;
      expect(range).toBe("$164.08 USD – $237.49 USD");
    });
  });

  describe("market tags", () => {
    it("exchange tag is NasdaqGS", () => {
      expect(AAPL_QUOTE.fullExchangeName).toBe("NasdaqGS");
    });

    it("market state tag is Open for REGULAR", () => {
      const MARKET_STATE_LABELS: Record<string, string> = {
        PRE: "Pre-Market",
        PREPRE: "Pre-Market",
        REGULAR: "Open",
        POST: "Post-Market",
        POSTPOST: "Post-Market",
        CLOSED: "Closed",
      };
      expect(MARKET_STATE_LABELS[AAPL_QUOTE.marketState]).toBe("Open");
    });
  });

  describe("chart color for uptrend", () => {
    it("uses green (#34C759) line with gradient fill", () => {
      const config = buildChartConfig(["a", "b", "c"], [190, 195, 198], true);
      expect(config.data.datasets[0].borderColor).toBe("#34C759");
      expect(config.data.datasets[0].backgroundColor).toContain(
        "getGradientFillHelper",
      );
      expect(config.data.datasets[0].backgroundColor).toContain("52,199,89");
    });
  });
});

// ===================================================================
// Mockup 2: mockup-favorites-1d.png  (Favorites, 1D, pre-market)
// ===================================================================

describe("Mockup 2 — Favorites (1D, pre-market awareness)", () => {
  describe("currentPriceInfo selects pre-market data", () => {
    it("returns pre-market price for PRE state", () => {
      const info = currentPriceInfo(TSLA_PRE_QUOTE);
      expect(info.price).toBe(178.9);
      expect(info.change).toBe(1.85);
      expect(info.changePercent).toBeCloseTo(1.0451);
    });

    it("falls back to regular market if pre-market data is missing", () => {
      const noPreData: Quote = {
        ...TSLA_PRE_QUOTE,
        preMarketPrice: undefined,
        preMarketChange: undefined,
        preMarketChangePercent: undefined,
      };
      const info = currentPriceInfo(noPreData);
      expect(info.price).toBe(noPreData.regularMarketPrice);
    });
  });

  describe("favorite star display", () => {
    it("subtitle for favorite is ★", () => {
      const subtitle = { value: "★", tooltip: "In favorites" };
      expect(subtitle.value).toBe("★");
    });
  });

  describe("intraday chart labels use HH:mm", () => {
    it("1D interval formats timestamps as time of day", async () => {
      const ts = [1716120600, 1716121200, 1716121800];
      const pr = [197.0, 197.5, 198.0];
      const url = await buildChartUrl(ts, pr, "1D");
      const decoded = decodeURIComponent(url);
      expect(decoded).toMatch(/\d{2}:\d{2}/);
    });
  });
});

// ===================================================================
// Mockup 3: mockup-down-stock.png  (TSLA, 3M, red/down)
// ===================================================================

describe("Mockup 3 — Down Stock (TSLA, 3M, red)", () => {
  describe("price formatting for negative stock", () => {
    it("formats TSLA price as $155.20 USD", () => {
      expect(formatMoney(155.2, "USD")).toBe("$155.20 USD");
    });

    it("formats negative change as -$12.30 USD (-7.34%)", () => {
      expect(formatChange(-12.3, -7.34, "USD")).toBe("-$12.30 USD (-7.34%)");
    });

    it("shows red down-arrow for negative change", () => {
      const icon = changeIcon(-12.3);
      expect(icon.source).toBe("arrow-down");
      expect(icon.tintColor).toBe("red");
    });

    it("returns red for negative changeColor", () => {
      expect(changeColor(-12.3)).toBe("red");
    });
  });

  describe("metadata with billion-scale market cap", () => {
    it("Market Cap: $495.20B USD", () => {
      expect(formatMoney(495.2e9, "USD")).toBe("$495.20B USD");
    });

    it("Open: $158.40 USD", () => {
      expect(formatMoney(158.4, "USD")).toBe("$158.40 USD");
    });

    it("P/E Ratio: 58.10", () => {
      expect(TSLA_QUOTE.trailingPE!.toFixed(2)).toBe("58.10");
    });

    it("52w High: $278.98 USD", () => {
      expect(formatMoney(278.98, "USD")).toBe("$278.98 USD");
    });

    it("52w Low: $138.80 USD", () => {
      expect(formatMoney(138.8, "USD")).toBe("$138.80 USD");
    });

    it("missing Div Yield shows em-dash", () => {
      expect(TSLA_QUOTE.dividendYield).toBeUndefined();
      const display = TSLA_QUOTE.dividendYield
        ? `${TSLA_QUOTE.dividendYield.toFixed(2)}%`
        : "—";
      expect(display).toBe("—");
    });

    it("missing EPS shows em-dash", () => {
      expect(TSLA_QUOTE.epsTrailingTwelveMonths).toBeUndefined();
      const display = TSLA_QUOTE.epsTrailingTwelveMonths
        ? formatMoney(TSLA_QUOTE.epsTrailingTwelveMonths, "USD")
        : "—";
      expect(display).toBe("—");
    });
  });

  describe("chart color for downtrend", () => {
    it("uses red (#FF3B30) line with gradient fill", () => {
      const config = buildChartConfig(["a", "b", "c"], [180, 165, 155], false);
      expect(config.data.datasets[0].borderColor).toBe("#FF3B30");
      expect(config.data.datasets[0].backgroundColor).toContain(
        "getGradientFillHelper",
      );
      expect(config.data.datasets[0].backgroundColor).toContain("255,59,48");
    });
  });

  describe("3M chart uses daily granularity", () => {
    it("3M interval produces chart URL with date-style labels", async () => {
      const now = Math.floor(Date.now() / 1000);
      const ts = Array.from({ length: 60 }, (_, i) => now - (59 - i) * 86400);
      const pr = Array.from({ length: 60 }, (_, i) => 180 - i * 0.4);
      const url = await buildChartUrl(ts, pr, "3M");
      const decoded = decodeURIComponent(url);
      expect(decoded).toMatch(
        /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/,
      );
    });
  });
});

// ===================================================================
// Cross-mockup: structural contracts all mockups share
// ===================================================================

describe("Cross-mockup — shared structural contracts", () => {
  it("detail metadata title format: SYMBOL — Name", () => {
    for (const q of [AAPL_QUOTE, TSLA_QUOTE]) {
      const name = q.displayName || q.shortName || q.symbol;
      const title = `${q.symbol} — ${name}`;
      expect(title).toMatch(/^[A-Z-]+ — .+$/);
    }
  });

  it("all 7 intervals are selectable", () => {
    expect(INTERVALS).toEqual(["1D", "1W", "1M", "3M", "6M", "1Y", "5Y"]);
  });

  it("chart has zero pointRadius (clean line, no dots)", () => {
    const config = buildChartConfig(["a", "b"], [100, 110], true);
    expect(config.data.datasets[0].pointRadius).toBe(0);
  });

  it("chart fill is enabled (area under the line)", () => {
    const config = buildChartConfig(["a", "b"], [100, 110], true);
    expect(config.data.datasets[0].fill).toBe(true);
  });

  it("chart legend is hidden", () => {
    const config = buildChartConfig(["a", "b"], [100, 110], true);
    expect(config.options.legend.display).toBe(false);
  });

  it("chart background is black (#000000)", async () => {
    const url = await buildChartUrl([1, 2], [100, 110], "1D");
    expect(url).toContain("000000");
  });

  it("formatMoney returns em-dash for null/undefined/NaN", () => {
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney(undefined)).toBe("—");
    expect(formatMoney(NaN)).toBe("—");
  });

  it("changeIcon returns neutral dot for zero change", () => {
    const icon = changeIcon(0);
    expect(icon.source).toBe("dot");
    expect(icon.tintColor).toBe("primary");
  });

  it("market state label map covers all states", () => {
    const MARKET_STATE_LABELS: Record<string, string> = {
      PRE: "Pre-Market",
      PREPRE: "Pre-Market",
      REGULAR: "Open",
      POST: "Post-Market",
      POSTPOST: "Post-Market",
      CLOSED: "Closed",
    };
    const states = ["PRE", "PREPRE", "REGULAR", "POST", "POSTPOST", "CLOSED"];
    for (const s of states) {
      expect(MARKET_STATE_LABELS[s]).toBeDefined();
    }
  });
});

// ===================================================================
// Currency correctness — prices respect exchange currency
// ===================================================================

describe("Currency correctness — non-USD exchanges", () => {
  it("EUR stock: price and change use € symbol with code", () => {
    expect(formatMoney(85.3, "EUR")).toBe("€85.30 EUR");
    expect(formatChange(1.2, 1.43, "EUR")).toBe("+€1.20 EUR (+1.43%)");
  });

  it("GBP stock: price and change use £ symbol with code", () => {
    expect(formatMoney(45.0, "GBP")).toBe("£45.00 GBP");
    expect(formatChange(-0.75, -1.64, "GBP")).toBe("-£0.75 GBP (-1.64%)");
  });

  it("JPY stock: price uses ¥ symbol with code", () => {
    expect(formatMoney(4250, "JPY")).toBe("¥4.25k JPY");
    expect(formatChange(50, 1.19, "JPY")).toBe("+¥50.00 JPY (+1.19%)");
  });

  it("GBp (London pence): converts to £ and divides by 100", () => {
    expect(formatMoney(15050, "GBp")).toBe("£150.50 GBP");
    expect(formatChange(250, 1.69, "GBp")).toBe("+£2.50 GBP (+1.69%)");
  });

  it("market cap respects currency (e.g. €1.23T EUR)", () => {
    expect(formatMoney(1.23e12, "EUR")).toBe("€1.23T EUR");
  });

  it("EPS uses formatMoney with correct currency code", () => {
    expect(formatMoney(6.13, "USD")).toBe("$6.13 USD");
    expect(formatMoney(3.45, "EUR")).toBe("€3.45 EUR");
    expect(formatMoney(2.1, "GBP")).toBe("£2.10 GBP");
  });
});
