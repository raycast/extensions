import { describe, expect, it } from "vitest";
import {
  buildPortfolioView,
  menuBarSummaryRows,
  menuBarTitle,
  sessionWeekday,
  shortTicker,
  todayLabel,
  topMovers,
  type DayQuote,
} from "./portfolio";
import { formatMoney, formatPct } from "./format";
import type { AccountSummary, Position } from "./t212/types";

const summary: AccountSummary = {
  id: 1,
  currency: "EUR",
  totalValue: 48213.4,
  cash: { availableToTrade: 1000, reservedForOrders: 204.55, inPies: 0 },
  investments: { currentValue: 47008.85, totalCost: 41301.22, unrealizedProfitLoss: 5707.63, realizedProfitLoss: 0 },
};

function pos(
  ticker: string,
  name: string,
  currency: string,
  value: number,
  cost: number,
  avg: number,
  cur: number,
): Position {
  return {
    instrument: { ticker, name, isin: `ISIN-${ticker}`, currency },
    quantity: 10,
    averagePricePaid: avg,
    currentPrice: cur,
    createdAt: "2024-03-01T10:00:00Z",
    walletImpact: {
      currency: "EUR",
      currentValue: value,
      totalCost: cost,
      unrealizedProfitLoss: value - cost,
      fxImpact: null,
    },
  };
}

const positions: Position[] = [
  pos("NVDA_US_EQ", "NVIDIA", "USD", 7008.85, 5000, 100, 140),
  pos("VUAAl_EQ", "Vanguard S&P 500", "GBX", 30000, 25000, 9500, 10200),
  pos("AAPL_US_EQ", "Apple", "USD", 10000, 8000, 180, 228.4),
];

const quotes: Record<string, DayQuote> = {
  VUAAl_EQ: { price: 100.2, previousClose: 100, marketTime: 1000 },
  AAPL_US_EQ: { price: 228.4, previousClose: 225.915, marketTime: 2000 },
  NVDA_US_EQ: { price: 140.42, previousClose: 140, marketTime: 1500 },
};

const down = (q: Record<string, DayQuote>) =>
  Object.fromEntries(Object.entries(q).map(([k, v]) => [k, { ...v, price: v.previousClose * 0.994 }]));

describe("buildPortfolioView", () => {
  const view = buildPortfolioView(summary, positions, quotes);

  it("derives totals", () => {
    expect(view.totalBalance).toBeCloseTo(48213.4, 2);
    expect(view.cash).toBeCloseTo(1204.55, 2);
    expect(view.invested).toBeCloseTo(41301.22, 2);
    expect(view.returnPct).toBeCloseTo(13.82, 2);
    expect(view.todayAsOf).toBe(2000);
  });

  it("sorts positions by value desc with today figures", () => {
    expect(view.positions.map((p) => p.ticker)).toEqual(["VUAAl_EQ", "AAPL_US_EQ", "NVDA_US_EQ"]);
    expect(view.positions[1].todayPct).toBeCloseTo(1.1, 1);
    expect(view.positions[1].weightPct).toBeCloseTo((10000 / 47008.85) * 100, 6);
    expect(view.positions[1].returnPct).toBeCloseTo(25, 6);
    expect(view.positions[1].heldSince).toBe("2024-03-01T10:00:00Z");
    expect(view.positions.map((p) => p.todayAsOf)).toEqual([1000, 2000, 1500]);
    expect(view.todayPct).toBeCloseTo(0.4, 1);
  });

  it("empty account has no NaN", () => {
    const empty = buildPortfolioView(
      {
        ...summary,
        cash: { availableToTrade: 0, reservedForOrders: 0, inPies: 0 },
        investments: { currentValue: 0, totalCost: 0, unrealizedProfitLoss: 0, realizedProfitLoss: 0 },
      },
      [],
      {},
    );
    expect(empty.positions).toEqual([]);
    expect(empty.todayAmount).toBeNull();
    expect(empty.returnPct).toBe(0);
    expect(JSON.stringify(empty)).not.toMatch(/NaN|Infinity/);
  });

  it("zero-cost position and zero holdings do not produce NaN", () => {
    const v = buildPortfolioView(summary, [pos("X_US_EQ", "X", "USD", 0, 0, 1, 1)], {});
    expect(v.positions[0].returnPct).toBe(0);
    expect(v.positions[0].weightPct).toBe(0);
  });

  it("no quotes gives null today values", () => {
    const v = buildPortfolioView(summary, positions, {});
    expect(v.todayAmount).toBeNull();
    expect(v.todayPct).toBeNull();
    expect(v.todayAsOf).toBeNull();
    expect(v.positions.every((p) => p.todayPct === null && p.todayAmount === null && p.todayAsOf === null)).toBe(true);
  });

  it("leaves the portfolio's today total out when any holding has no quote", () => {
    // A partial sum can even flip the sign of the real day; per-position figures stay.
    const { NVDA_US_EQ, ...partial } = quotes;
    void NVDA_US_EQ;
    const v = buildPortfolioView(summary, positions, partial);
    expect(v.todayAmount).toBeNull();
    expect(v.todayPct).toBeNull();
    expect(v.positions.find((p) => p.ticker === "AAPL_US_EQ")?.todayPct).not.toBeNull();
  });

  it("GBX position prices are in GBP", () => {
    const vuaa = view.positions[0];
    expect(vuaa.avgPrice).toBeCloseTo(95, 6);
    expect(vuaa.currentPrice).toBeCloseTo(102, 6);
    expect(vuaa.priceCurrency).toBe("GBP");
  });
});

describe("topMovers", () => {
  it("orders by absolute move, excludes nulls, max 3", () => {
    const view = buildPortfolioView(summary, positions, quotes);
    expect(topMovers(view).map((p) => p.ticker)).toEqual(["AAPL_US_EQ", "NVDA_US_EQ", "VUAAl_EQ"]);
    expect(topMovers(view, 1)).toHaveLength(1);
    const partial = buildPortfolioView(summary, positions, { AAPL_US_EQ: quotes.AAPL_US_EQ });
    expect(topMovers(partial).map((p) => p.ticker)).toEqual(["AAPL_US_EQ"]);
  });
});

describe("menuBarTitle", () => {
  const view = buildPortfolioView(summary, positions, quotes);
  it("formats amount and change", () => {
    expect(menuBarTitle(view, true)).toBe("€48,213 ⏶\u20090.4%");
    expect(menuBarTitle(view, false)).toBe("⏶\u20090.4%");
  });
  it("handles missing today data", () => {
    const v = buildPortfolioView(summary, positions, {});
    expect(menuBarTitle(v, true)).toBe("€48,213");
    expect(menuBarTitle(v, false)).toBe("Trading 212");
  });
  it("shows a down arrow for losses", () => {
    expect(menuBarTitle(buildPortfolioView(summary, positions, down(quotes)), true)).toBe("€48,213 ⏷\u20090.6%");
  });
  it("uses up arrow for a move that rounds to zero", () => {
    const flat = { ...view, todayPct: -0.01 };
    expect(menuBarTitle(flat, false)).toBe("⏶\u20090.0%");
  });
  it("handles null view", () => {
    expect(menuBarTitle(null, true)).toBe("Trading 212");
  });
});

describe("shortTicker", () => {
  it("drops the market suffix of US tickers", () => {
    expect(shortTicker("AAPL_US_EQ")).toBe("AAPL");
  });
  it("strips the trailing lowercase venue letter", () => {
    expect(shortTicker("VUAAl_EQ")).toBe("VUAA");
    expect(shortTicker("SAPd_EQ")).toBe("SAP");
  });
  it("keeps tickers with digits and dots intact", () => {
    expect(shortTicker("BRK.B_US_EQ")).toBe("BRK.B");
    expect(shortTicker("3IN1l_EQ")).toBe("3IN1");
  });
  it("returns the whole ticker when there is no underscore", () => {
    expect(shortTicker("VWCE")).toBe("VWCE");
  });
});

describe("session labels", () => {
  const friday = new Date(2026, 10, 13, 16, 30).getTime();
  const fridayEvening = new Date(2026, 10, 13, 22, 0).getTime();
  const sunday = new Date(2026, 10, 15, 10, 0).getTime();

  it("sessionWeekday is null when the session is on the current local date", () => {
    expect(sessionWeekday(friday, fridayEvening)).toBeNull();
  });
  it("sessionWeekday names the weekday of an earlier session", () => {
    expect(sessionWeekday(friday, sunday)).toBe("Fri");
  });
  it("sessionWeekday is null without a session time", () => {
    expect(sessionWeekday(null, sunday)).toBeNull();
  });
  it("todayLabel says Today for today's session or none", () => {
    expect(todayLabel(friday, fridayEvening)).toBe("Today");
    expect(todayLabel(null, sunday)).toBe("Today");
  });
  it("todayLabel names the last session when it was on an earlier date", () => {
    expect(todayLabel(friday, sunday)).toBe("Last session (Fri)");
  });
});

describe("menuBarSummaryRows", () => {
  const view = buildPortfolioView(summary, positions, quotes);
  const now = new Date(2026, 10, 13, 22, 0).getTime();
  const change = (pct: number, amount: number) =>
    `${formatPct(pct, { signed: true })} · ${formatMoney(amount, view.currency, { signed: true, decimals: 0 })}`;
  it("lists today and return: percentage first, whole amounts, colored by direction", () => {
    const rows = menuBarSummaryRows(view, view.todayAsOf ?? now, { showBalance: false });
    expect(rows.map((r) => r.title)).toEqual(["Today", "Return"]);
    expect(rows[0]).toEqual({ title: "Today", value: change(view.todayPct ?? 0, view.todayAmount ?? 0), tone: "up" });
    expect(rows[1]).toEqual({ title: "Return", value: change(view.returnPct, view.returnAmount), tone: "up" });
  });
  it("adds the balance first when the menu bar title hides it", () => {
    const rows = menuBarSummaryRows(view, now, { showBalance: true });
    expect(rows[0]).toEqual({
      title: "Balance",
      value: formatMoney(view.totalBalance, view.currency, { decimals: 0 }),
    });
  });
  it("omits Today without data and labels an earlier session", () => {
    const none = buildPortfolioView(summary, positions, {});
    expect(menuBarSummaryRows(none, now, { showBalance: false }).map((r) => r.title)).toEqual(["Return"]);
    const later = new Date(2026, 10, 15, 10, 0).getTime();
    const asOf = { ...view, todayAsOf: new Date(2026, 10, 13, 16, 30).getTime() };
    expect(menuBarSummaryRows(asOf, later, { showBalance: false })[0].title).toBe("Last session (Fri)");
  });
  it("marks losses as down", () => {
    const losing = { ...view, returnAmount: -100, returnPct: -2 };
    expect(menuBarSummaryRows(losing, now, { showBalance: false }).at(-1)?.tone).toBe("down");
  });
});
