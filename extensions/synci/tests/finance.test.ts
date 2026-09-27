import { describe, expect, it } from "vitest";
import { balanceTotals, connectionState, dateRange, spendingSummary } from "../src/lib/finance";
import { accountBalance, accountUrl, dateLabel, decimal, markdown, money, transactionName } from "../src/lib/format";
import type { FinancialAccount, FinancialConnection, Transaction } from "../src/lib/types";

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  financial_account_id: 1,
  amount: "-0.10",
  currency: "NOK",
  booked: true,
  mapped_fields: { payee: "Coffee" },
  ...overrides,
});
const account = (overrides: Partial<FinancialAccount> = {}): FinancialAccount => ({
  id: 1,
  enabled: true,
  currency: "NOK",
  ...overrides,
});
const connection = (overrides: Partial<FinancialConnection> = {}): FinancialConnection => ({
  id: 1,
  enabled: true,
  status: "CONNECTED",
  health: { status: "HEALTHY" },
  ...overrides,
});

describe("spending", () => {
  it("sums major units exactly and keeps currencies separate", () => {
    const summary = spendingSummary([
      transaction(),
      transaction({ id: 2, amount: "-0.20" }),
      transaction({ id: 3, amount: "-10", currency: "EUR" }),
    ]);
    expect(summary.currencies.map(([currency, total]) => [currency, total.amount.toString()])).toEqual([
      ["EUR", "10"],
      ["NOK", "0.3"],
    ]);
    expect(summary.currencies[1][1].count).toBe(2);
  });
  it("excludes pending, zero, refunds, and duplicate page records", () => {
    const summary = spendingSummary([
      transaction(),
      transaction(),
      transaction({ id: 2, booked: false }),
      transaction({ id: 3, amount: "12" }),
      transaction({ id: 4, amount: "0" }),
    ]);
    expect(summary.currencies[0][1].count).toBe(1);
    expect(summary.currencies[0][1].amount.toString()).toBe("0.1");
  });
  it("reports invalid values instead of silently presenting them as zero", () => {
    const summary = spendingSummary([transaction({ amount: "NaN" }), transaction({ id: 2, currency: "" })]);
    expect(summary.invalid).toBe(2);
    expect(summary.currencies).toHaveLength(0);
  });
  it("keeps transfers as outflows because no reliable transfer flag exists", () => {
    expect(
      spendingSummary([
        transaction({ mapped_fields: { payee: "Transfer to Savings" }, amount: "-500" }),
      ]).currencies[0][1].amount.toString(),
    ).toBe("500");
  });
});

describe("balances", () => {
  it("preserves zero and prefers cleared balances", () => {
    expect(accountBalance(account({ balance: { cleared: 0, available: 20 } })).amount).toBe(0);
  });
  it("does not invent a zero for an omitted balance", () => {
    const summary = balanceTotals([account({ balance: {} }), account({ id: 2, balance: { cleared: 0 } })]);
    expect(summary.unavailable).toBe(1);
    expect(summary.totals[0][1].amount.toString()).toBe("0");
    expect(summary.totals[0][1].count).toBe(1);
    expect(money(undefined, "NOK")).toBe("Unavailable");
  });
  it("uses the portfolio total currency when it differs from the account", () => {
    const summary = balanceTotals([
      account({ currency: "EUR", total_balance: { amount: "1000.12", currency: "USD" } }),
      account({ id: 2, balance: { cleared: -50 } }),
    ]);
    expect(summary.totals.map(([currency, total]) => [currency, total.amount.toString()])).toEqual([
      ["NOK", "-50"],
      ["USD", "1000.12"],
    ]);
  });
});

describe("calendar dates", () => {
  it("uses inclusive local calendar days across a month boundary", () => {
    expect(dateRange("7", new Date(2026, 2, 2, 23, 30))).toEqual({ after: "2026-02-24", before: "2026-03-02" });
    expect(dateRange("month", new Date(2026, 8, 25))).toEqual({ after: "2026-09-01", before: "2026-09-25" });
    expect(dateRange("all")).toEqual({});
  });
  it("does not shift ISO date-only strings across time zones", () => {
    expect(dateLabel("2026-09-25")).toContain("25");
    expect(dateLabel("invalid")).toBe("Not reported");
  });
});

describe("connection health", () => {
  const now = new Date("2026-09-25T12:00:00Z");
  it("recognizes CONNECTED as the healthy lifecycle status", () => {
    expect(connectionState(connection(), now).label).toBe("Healthy");
  });
  it("prioritizes expired consent over reported health", () => {
    expect(connectionState(connection({ consent_expires_at: "2026-09-24T12:00:00Z" }), now).label).toBe(
      "Consent Expired",
    );
  });
  it("distinguishes disabled, unhealthy, expiring, and unknown connections", () => {
    expect(connectionState(connection({ enabled: false }), now).label).toBe("Disabled");
    expect(connectionState(connection({ health: { status: "DEAD" } }), now).severity).toBe(3);
    expect(connectionState(connection({ consent_expires_at: "2026-09-29T00:00:00Z" }), now).label).toBe(
      "Consent Expiring",
    );
    expect(connectionState(connection({ health: null }), now).label).toBe("Unknown");
  });
});

describe("presentation", () => {
  it("uses the correct counterparty for each direction", () => {
    expect(
      transactionName(transaction({ mapped_fields: null, creditor: { name: "Shop" }, debtor: { name: "Me" } })),
    ).toBe("Shop");
    expect(transactionName(transaction({ amount: "100", mapped_fields: null, debtor: { name: "Employer" } }))).toBe(
      "Employer",
    );
  });
  it("does not interpret transaction text as markdown or embedded images", () => {
    expect(markdown("![x](https://tracker.test) | <tag>")).toBe("\\!\\[x\\]\\(https://tracker\\.test\\) \\| \\<tag\\>");
  });
  it("handles malformed amounts and unusual currencies", () => {
    expect(decimal("Infinity")).toBeUndefined();
    expect(money("12.5", "CUSTOM")).toBe("12.50 CUSTOM");
  });
  it("routes investment and crypto accounts to their dashboard sections", () => {
    expect(
      accountUrl(account({ financial_connection: connection({ institution: { id: 3, category: "BROKERAGE" } }) })),
    ).toContain("/brokerages/accounts/1");
    expect(accountUrl(account())).toContain("/banks/accounts/1");
  });
  it.each([
    { account_category: "INVESTMENT" },
    { integrator: "SNAPTRADE" },
    { account_category: "INVESTMENT", financial_connection: connection({ institution: null }) },
    {
      integrator: "SNAPTRADE",
      financial_connection: connection({ institution: { id: 3, category: "UNKNOWN" } }),
    },
  ])("routes accounts with incomplete institution metadata using account/provider signals: %j", (fields) => {
    expect(accountUrl(account(fields))).toContain("/brokerages/accounts/1");
  });
  it("keeps crypto accounts in the crypto section even with investment/provider signals", () => {
    expect(
      accountUrl(
        account({
          account_category: "INVESTMENT",
          integrator: "SNAPTRADE",
          financial_connection: connection({ institution: { id: 3, category: "crypto" } }),
        }),
      ),
    ).toContain("/crypto/accounts/1");
  });
});
