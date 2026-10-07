import { describe, expect, it } from "vitest";
import { holdingFields, holdingPrice, holdingsTotals, quantity, supportsHoldings } from "../src/lib/holdings";
import type { AccountHolding, FinancialAccount } from "../src/lib/types";

const account: FinancialAccount = { id: 1, name: "Brokerage", enabled: true, account_category: "INVESTMENT" };
const holding = (fields: Partial<AccountHolding> = {}): AccountHolding => ({
  id: 1,
  financial_account_id: 1,
  symbol: "TEST",
  quantity: "1",
  market_value: "0.10",
  currency: "EUR",
  ...fields,
});

describe("holdings", () => {
  it("totals reported values exactly within each currency, including short positions and zero", () => {
    const summary = holdingsTotals([
      holding(),
      holding({ id: 2, market_value: "0.20" }),
      holding({ id: 3, market_value: "-0.10" }),
      holding({ id: 4, market_value: "0" }),
      holding({ id: 5, market_value: "20", currency: "USD" }),
    ]);
    expect(summary.totals.map(([currency, total]) => [currency, total.amount.toString(), total.count])).toEqual([
      ["EUR", "0.2", 4],
      ["USD", "20", 1],
    ]);
    expect(summary.unavailable).toBe(0);
  });
  it("excludes missing or invalid market values without estimating them from quantity and price", () => {
    const summary = holdingsTotals([
      holding({ market_value: null, quantity: "10", last_price: "5" }),
      holding({ id: 2, market_value: "NaN" }),
      holding({ id: 3, currency: null }),
    ]);
    expect(summary.totals).toEqual([]);
    expect(summary.unavailable).toBe(3);
  });
  it("deduplicates pages without merging distinct positions in the same symbol across accounts", () => {
    const result = holdingsTotals([holding(), holding(), holding({ financial_account_id: 2 })]);
    expect(result.totals[0][1].amount.toString()).toBe("0.2");
    expect(result.totals[0][1].count).toBe(2);
  });
  it("preserves fractional crypto quantities and distinguishes missing values from zero", () => {
    expect(quantity("0.00000001")).toBe("0.00000001");
    expect(quantity("123456789.12345678")).toBe("123456789.12345678");
    expect(quantity("0.00000000")).toBe("0");
    expect(quantity(null)).toBe("Unavailable");
    expect(holdingPrice("0.00000001", "USD")).toMatch(/0[.,]00000001/);
    expect(holdingPrice(null, "USD")).toBe("Unavailable");
    expect(holdingPrice("0", "USD")).not.toBe("Unavailable");
  });
  it("uses account, provider, and institution categories to discover supported accounts", () => {
    expect(supportsHoldings(account)).toBe(true);
    expect(supportsHoldings({ ...account, account_category: "DEPOSIT", integrator: "SNAPTRADE" })).toBe(true);
    expect(
      supportsHoldings({
        id: 2,
        enabled: true,
        financial_connection: { id: 1, enabled: true, institution: { id: 1, category: "CRYPTO" } },
      }),
    ).toBe(true);
    expect(supportsHoldings({ id: 3, enabled: true, account_category: "BANK", integrator: "GOCARDLESS" })).toBe(false);
  });
  it("shows the snapshot timestamp, quote currency, and unavailable cost basis without inventing gains", () => {
    const fields = Object.fromEntries(holdingFields(holding({ average_purchase_price: null }), account));
    expect(fields.Currency).toBe("EUR");
    expect(fields["Average Purchase Price"]).toBe("Unavailable");
    expect(fields["Last Synced"]).toBe("Not reported");
    expect(fields.Account).toBe("Brokerage");
    expect(fields).not.toHaveProperty("Gain");
  });
});
