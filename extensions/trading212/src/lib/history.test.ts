import { describe, expect, it } from "vitest";
import type { DividendItem, HistoricalOrder, TransactionItem } from "./t212/types";
import {
  buildTransactionRows,
  groupByMonth,
  humanizeEnum,
  monthKey,
  orderHeadline,
  orderTypeLabel,
  orderView,
  summarizeDeposits,
  summarizeDividends,
  txRowSignedAmount,
  txRowTitle,
  type TxRow,
} from "./history";

const now = new Date("2026-11-13T12:00:00Z");

const instr = (ticker: string, name: string, currency = "USD") => ({ ticker, name, isin: "X", currency });

function div(ticker: string, name: string, amount: number, paidOn: string): DividendItem {
  return {
    reference: `${ticker}-${paidOn}`,
    ticker,
    instrument: instr(ticker, name),
    amount,
    currency: "EUR",
    tickerCurrency: "USD",
    grossAmountPerShare: 1,
    quantity: 1,
    paidOn,
    type: "ORDINARY",
  };
}

describe("monthKey / groupByMonth", () => {
  it("keys by UTC month", () => {
    expect(monthKey("2026-11-12T10:00:00Z")).toBe("2026-11");
    expect(monthKey("2026-10-31T23:30:00Z")).toBe("2026-10");
  });

  it("groups newest month first with long labels and newest items first", () => {
    const items = [{ d: "2026-10-02T00:00:00Z" }, { d: "2026-11-01T00:00:00Z" }, { d: "2026-10-20T00:00:00Z" }];
    const g = groupByMonth(items, (i) => i.d);
    expect(g.map((x) => x.key)).toEqual(["2026-11", "2026-10"]);
    expect(g[0].label).toBe("November 2026");
    expect(g[1].items.map((i) => i.d)).toEqual(["2026-10-20T00:00:00Z", "2026-10-02T00:00:00Z"]);
    expect(groupByMonth([], (x: string) => x)).toEqual([]);
  });
});

describe("summarizeDividends", () => {
  const items = [
    div("AAPL", "Apple", 10, "2026-11-05T00:00:00Z"),
    div("AAPL", "Apple", 10, "2026-08-05T00:00:00Z"),
    div("KO", "Coca-Cola", 5, "2026-02-01T00:00:00Z"),
    div("KO", "Coca-Cola", 8, "2025-12-15T00:00:00Z"),
    div("KO", "Coca-Cola", 12, "2025-06-01T00:00:00Z"), // prior12
    div("MSFT", "Microsoft", 8, "2024-12-01T00:00:00Z"), // prior12 (Nov 2024 - Oct 2025 window starts 2024-11)
    div("OLD", "Old", 100, "2023-01-01T00:00:00Z"),
  ];

  it("builds 12 zero-filled months ending in now's month", () => {
    const s = summarizeDividends(items, now);
    expect(s.months).toHaveLength(12);
    expect(s.months[0].key).toBe("2025-12");
    expect(s.months[11].key).toBe("2026-11");
    expect(s.months[0].label).toBe("D");
    expect(s.months[10].label).toBe("O");
    expect(s.months[11].value).toBe(10);
    expect(s.months[1].value).toBe(0);
  });

  it("computes totals, change and top payer", () => {
    const s = summarizeDividends(items, now);
    expect(s.last12).toBe(33);
    expect(s.prior12).toBe(20);
    expect(s.changePct).toBeCloseTo(65, 5);
    expect(s.thisYear).toBe(25);
    expect(s.allTime).toBe(153);
    expect(s.monthlyAvg).toBeCloseTo(33 / 12, 10);
    expect(s.topPayer).toEqual({ ticker: "AAPL", name: "Apple", amount: 20 });
  });

  it("handles empty input and null change", () => {
    expect(summarizeDividends([], now)).toMatchObject({
      last12: 0,
      prior12: 0,
      allTime: 0,
      thisYear: 0,
      monthlyAvg: 0,
      changePct: null,
      topPayer: null,
    });
    const onlyRecent = summarizeDividends([div("A", "A", 1, "2026-11-01T00:00:00Z")], now);
    expect(onlyRecent.changePct).toBeNull();
    // A prior year of a few crowns makes the % meaningless ("+28 759 %"): no comparison then.
    const tinyPrior = summarizeDividends(
      [div("A", "A", 1, "2025-06-01T00:00:00Z"), div("A", "A", 500, "2026-06-01T00:00:00Z")],
      now,
    );
    expect(tinyPrior.changePct).toBeNull();
    const tenth = summarizeDividends(
      [div("A", "A", 50, "2025-06-01T00:00:00Z"), div("A", "A", 500, "2026-06-01T00:00:00Z")],
      now,
    );
    expect(tenth.changePct).toBeCloseTo(900);
  });
});

function tx(
  type: TransactionItem["type"],
  amount: number,
  dateTime: string,
  ref = `${type}-${dateTime}-${amount}`,
): TransactionItem {
  return { reference: ref, type, amount, currency: "EUR", dateTime };
}

describe("buildTransactionRows", () => {
  it("merges interest into one row per month", () => {
    const items: TransactionItem[] = [];
    for (let d = 1; d <= 30; d++) {
      items.push(tx("INTEREST_ON_FREE_CASH", 0.1, `2026-10-${String(d).padStart(2, "0")}T00:00:00Z`));
    }
    items.push(tx("LENDING_INTEREST", 0.5, "2026-10-31T00:00:00Z"));
    items.push(tx("LENDING_INTEREST", 0.5, "2026-10-15T01:00:00Z"));
    items.push(tx("DEPOSIT", 100, "2026-10-20T10:00:00Z"));
    const rows = buildTransactionRows(items);
    expect(rows).toHaveLength(2);
    const interest = rows.filter((r) => r.kind === "interest");
    expect(interest).toHaveLength(1);
    expect(interest[0]).toMatchObject({ kind: "interest", month: "2026-10", count: 32, date: "2026-10-31T00:00:00Z" });
    expect((interest[0] as { amount: number }).amount).toBeCloseTo(4, 10);
    expect(rows[0].kind).toBe("interest");
    expect(rows[1]).toMatchObject({ kind: "deposit", amount: 100 });
  });

  it("classifies kinds with positive amounts, newest first", () => {
    const rows = buildTransactionRows([
      tx("WITHDRAW", -50, "2026-01-01T00:00:00Z", "w"),
      tx("FEE", -2, "2026-01-03T00:00:00Z", "f"),
      tx("TRANSFER", 30, "2026-01-02T00:00:00Z", "ti"),
      tx("TRANSFER", -10, "2026-01-04T00:00:00Z", "to"),
    ]);
    expect(rows.map((r) => r.kind)).toEqual(["transfer-out", "fee", "transfer-in", "withdrawal"]);
    expect(rows.map((r) => r.amount)).toEqual([10, 2, 30, 50]);
    expect(rows[0]).toMatchObject({ reference: "to" });
    expect(buildTransactionRows([])).toEqual([]);
  });
});

describe("summarizeDeposits", () => {
  it("totals money in/out", () => {
    const d = summarizeDeposits(
      [
        tx("DEPOSIT", 500, "2026-01-01T00:00:00Z"),
        tx("DEPOSIT", 500, "2026-02-01T00:00:00Z"),
        tx("WITHDRAW", -1200, "2026-03-01T00:00:00Z"),
        tx("TRANSFER", 300, "2026-04-01T00:00:00Z"),
        tx("TRANSFER", -100, "2026-05-01T00:00:00Z"),
        tx("FEE", -2, "2026-06-01T00:00:00Z"),
        tx("INTEREST_ON_FREE_CASH", 0.14, "2026-07-01T00:00:00Z"),
      ],
      now,
    );
    expect(d).toMatchObject({ deposited: 1300, withdrawn: 1300, netDeposited: 0, fees: 2, interest: 0.14 });
    // Net money in per month for the last 24 months, oldest first; fees and interest don't count.
    expect(d.months).toHaveLength(24);
    expect(d.months[23].key).toBe("2026-11");
    expect(d.months[0].key).toBe("2024-12");
    const byKey = Object.fromEntries(d.months.map((m) => [m.key, m.value]));
    expect([byKey["2026-01"], byKey["2026-02"], byKey["2026-03"], byKey["2026-04"], byKey["2026-05"]]).toEqual([
      500, 500, -1200, 300, -100,
    ]);
    expect(byKey["2026-06"]).toBe(0);
    expect(byKey["2026-07"]).toBe(0);
  });

  it("computes this-year net and handles empty", () => {
    const d = summarizeDeposits(
      [
        tx("DEPOSIT", 1000, "2025-12-31T23:59:59Z"),
        tx("DEPOSIT", 200, "2026-01-01T00:00:00Z"),
        tx("WITHDRAW", 50, "2026-02-01T00:00:00Z"),
      ],
      now,
    );
    expect(d.thisYear).toBe(150);
    expect(d.netDeposited).toBe(1150);
    const empty = summarizeDeposits([], now);
    expect(empty).toMatchObject({ netDeposited: 0, deposited: 0, withdrawn: 0, fees: 0, interest: 0, thisYear: 0 });
    expect(empty.months).toHaveLength(24);
    expect(empty.months.every((m) => m.value === 0)).toBe(true);
  });
});

function order(
  over: Partial<HistoricalOrder["order"]> = {},
  fill?: Partial<NonNullable<HistoricalOrder["fill"]>> | null,
): HistoricalOrder {
  const o: HistoricalOrder = {
    order: {
      id: 1,
      ticker: "NVDA_US_EQ",
      instrument: instr("NVDA_US_EQ", "NVIDIA"),
      side: "BUY",
      status: "FILLED",
      type: "MARKET",
      quantity: 2,
      currency: "USD",
      createdAt: "2026-10-01T10:00:00Z",
      ...over,
    },
  };
  if (fill !== null) {
    o.fill = {
      id: 9,
      filledAt: "2026-10-01T10:00:05Z",
      price: 132.1,
      quantity: 2,
      type: "TRADE",
      walletImpact: {
        currency: "EUR",
        netValue: -240.5,
        fxRate: 1.1,
        realisedProfitLoss: 0,
        taxes: [
          { name: "STAMP", quantity: -0.5, currency: "EUR" },
          { name: "FX", quantity: 0.25, currency: "EUR" },
        ],
      },
      ...fill,
    };
  }
  return o;
}

describe("orderView", () => {
  const prices = { NVDA_US_EQ: { price: 148.75, currency: "USD" } };

  it("describes a filled buy", () => {
    const v = orderView(order(), prices);
    expect(v).toMatchObject({
      title: "Buy NVDA",
      status: "filled",
      statusLabel: "Filled",
      side: "BUY",
      shares: 2,
      fillPrice: { price: 132.1, currency: "USD" },
      total: 240.5,
      fees: 0.75,
      date: "2026-10-01T10:00:05Z",
    });
    expect(v.sinceThenPct).toBeCloseTo(12.6, 1);
  });

  it("returns null sinceThenPct for sells, currency mismatch, missing price", () => {
    expect(orderView(order({ side: "SELL" }, { quantity: -2 }), prices).sinceThenPct).toBeNull();
    expect(orderView(order({ side: "SELL" }, { quantity: -2 }), prices).shares).toBe(2);
    expect(orderView(order(), { NVDA_US_EQ: { price: 148.75, currency: "EUR" } }).sinceThenPct).toBeNull();
    expect(orderView(order(), {}).sinceThenPct).toBeNull();
  });

  it("returns null fillPrice and sinceThenPct when the fill price is not finite", () => {
    for (const bad of [NaN, undefined as unknown as number]) {
      const v = orderView(order({}, { price: bad }), { NVDA_US_EQ: { price: 148.75, currency: "USD" } });
      expect(v.fillPrice).toBeNull();
      expect(v.sinceThenPct).toBeNull();
    }
  });

  it("converts minor-unit fill prices", () => {
    const v = orderView(
      order({ ticker: "VOD_EQ", instrument: instr("VOD_EQ", "Vodafone", "GBX"), currency: "GBX" }, { price: 70 }),
      { VOD_EQ: { price: 0.77, currency: "GBP" } },
    );
    expect(v.fillPrice).toEqual({ price: 0.7, currency: "GBP" });
    expect(v.sinceThenPct).toBeCloseTo(10, 5);
  });

  it("handles cancelled orders without a fill", () => {
    const v = orderView(order({ status: "CANCELLED", filledQuantity: undefined, quantity: 3 }, null), {});
    expect(v).toMatchObject({
      status: "cancelled",
      statusLabel: "Canceled",
      shares: 3,
      fillPrice: null,
      total: null,
      fees: 0,
      date: "2026-10-01T10:00:00Z",
      sinceThenPct: null,
    });
  });

  it("maps rejected and pending, and null shares", () => {
    expect(orderView(order({ status: "REJECTED" }, null), {}).statusLabel).toBe("Rejected");
    const p = orderView(order({ status: "NEW", quantity: undefined }, null), {});
    expect(p).toMatchObject({ status: "pending", statusLabel: "Pending", shares: null });
  });
});

describe("humanizeEnum", () => {
  it("sentence-cases API enums", () => {
    expect(humanizeEnum("ORDINARY")).toBe("Ordinary");
    expect(humanizeEnum("RETURN_OF_CAPITAL")).toBe("Return of capital");
    expect(humanizeEnum("STOP_LIMIT")).toBe("Stop limit");
    expect(humanizeEnum("")).toBe("");
  });
});

describe("txRowTitle / txRowSignedAmount", () => {
  const row = (kind: Exclude<TxRow["kind"], "interest">, amount = 5): TxRow => ({
    kind,
    date: "2026-10-01T00:00:00Z",
    amount,
    reference: kind,
  });

  it("titles rows; interest rows sit under their month section", () => {
    expect(txRowTitle(row("deposit"))).toBe("Deposit");
    expect(txRowTitle(row("withdrawal"))).toBe("Withdrawal");
    expect(txRowTitle(row("fee"))).toBe("Fee");
    expect(txRowTitle(row("transfer-in"))).toBe("Transfer in");
    expect(txRowTitle(row("transfer-out"))).toBe("Transfer out");
    const interest: TxRow = {
      kind: "interest",
      month: "2026-10",
      date: "2026-10-31T00:00:00Z",
      amount: 4.12,
      count: 31,
    };
    expect(txRowTitle(interest)).toBe("Interest on cash");
  });

  it("signs money in positive and money out negative", () => {
    expect(txRowSignedAmount(row("deposit"))).toBe(5);
    expect(txRowSignedAmount(row("transfer-in"))).toBe(5);
    expect(txRowSignedAmount(row("withdrawal"))).toBe(-5);
    expect(txRowSignedAmount(row("fee"))).toBe(-5);
    expect(txRowSignedAmount(row("transfer-out"))).toBe(-5);
    expect(txRowSignedAmount({ kind: "interest", month: "2026-10", date: "x", amount: 4.12, count: 1 })).toBe(4.12);
  });
});

describe("orderTypeLabel / orderHeadline", () => {
  it("labels the order type with its side", () => {
    expect(orderTypeLabel("MARKET", "BUY")).toBe("Market buy");
    expect(orderTypeLabel("STOP_LIMIT", "SELL")).toBe("Stop limit sell");
  });

  it("uses past tense for filled orders and the short ticker", () => {
    expect(orderHeadline(orderView(order({}, { quantity: 2.5 }), {}), "NVDA")).toBe("Bought 2.5 NVDA");
    expect(orderHeadline(orderView(order({ side: "SELL" }, { quantity: -2 }), {}), "NVDA")).toBe("Sold 2 NVDA");
    expect(orderHeadline(orderView(order({ status: "CANCELLED", quantity: 3 }, null), {}), "NVDA")).toBe("Buy 3 NVDA");
    expect(orderHeadline(orderView(order({ status: "NEW", quantity: undefined }, null), {}), "NVDA")).toBe("Buy NVDA");
  });
});
