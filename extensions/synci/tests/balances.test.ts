import { describe, expect, it } from "vitest";
import { restoreMissingBalances } from "../src/lib/balances";
import type { BalanceEntry, FinancialAccount } from "../src/lib/types";

const account: FinancialAccount = { id: 1, enabled: true, currency: "NOK", balance: {} };
const entry = (values: Partial<BalanceEntry> = {}): BalanceEntry => ({
  id: 1,
  amount: "0",
  currency: "NOK",
  type: "CLOSING_BOOKED",
  reference_date: "2026-09-24",
  updated_at: "2026-09-24T12:00:00Z",
  ...values,
});
const now = new Date("2026-09-25T12:00:00Z");

describe("missing summary balance recovery", () => {
  it("recovers explicit zero values from complete history", () => {
    expect(restoreMissingBalances(account, [entry()], now).balance).toEqual({ cleared: "0", available: "0" });
  });
  it("keeps missing values unknown and does not overwrite known values", () => {
    expect(restoreMissingBalances(account, [], now).balance?.cleared).toBeUndefined();
    expect(restoreMissingBalances({ ...account, balance: { cleared: 20 } }, [entry()], now).balance?.cleared).toBe(20);
  });
  it("respects the server's balance-type priorities, including zero", () => {
    const result = restoreMissingBalances(
      account,
      [entry({ amount: "100", type: "INTERIM_BOOKED" }), entry({ id: 2, type: "CLOSING_CLEARED" })],
      now,
    );
    expect(result.balance?.cleared).toBe("0");
  });
  it("orders updates before bank reference dates, matching the account summary", () => {
    const result = restoreMissingBalances(
      account,
      [
        entry({ amount: "500", reference_date: "2026-09-25", updated_at: "2026-09-24T00:00:00Z" }),
        entry({ id: 2, reference_date: "2026-09-23", updated_at: "2026-09-25T00:00:00Z" }),
      ],
      now,
    );
    expect(result.balance?.cleared).toBe("0");
  });
  it("excludes future snapshots and never relabels another currency", () => {
    const result = restoreMissingBalances(
      account,
      [entry({ amount: "100", reference_date: "2027-01-01" }), entry({ id: 2, currency: "USD" })],
      now,
    );
    expect(result.balance?.cleared).toBeUndefined();
  });
  it("retains credit-limit information without inventing an adjustment", () => {
    const result = restoreMissingBalances(
      account,
      [entry({ type: "CLOSING_AVAILABLE", amount: "1500", credit_limit_included: true })],
      now,
    );
    expect(result.balance?.available).toBe("1500");
    expect(result.balance_warning).toContain("credit limit");
  });
});
