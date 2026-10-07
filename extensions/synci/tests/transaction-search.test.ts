import { describe, expect, it } from "vitest";
import { amountSearch } from "../src/lib/transaction-search";
import type { Transaction } from "../src/lib/types";

const transaction = (amount: string): Transaction => ({
  id: 1,
  financial_account_id: 1,
  amount,
  currency: "NOK",
  booked: true,
});

describe("amount search", () => {
  it("matches exact decimal amounts in both directions without floating-point comparisons", () => {
    const search = amountSearch("50,25");
    expect(search?.matches(transaction("50.250"))).toBe(true);
    expect(search?.matches(transaction("-50.25"))).toBe(true);
    expect(search?.matches(transaction("150.25"))).toBe(false);
    expect(search?.matches(transaction("50.251"))).toBe(false);
    expect(search?.matches(transaction("NaN"))).toBe(false);
  });
  it("honors explicit signs, including the localized minus sign, and zero", () => {
    expect(amountSearch("−50")?.matches(transaction("-50"))).toBe(true);
    expect(amountSearch("-50")?.matches(transaction("50"))).toBe(false);
    expect(amountSearch("+50")?.matches(transaction("-50"))).toBe(false);
    expect(amountSearch("+50")?.label).toBe("+50");
    expect(amountSearch("0")?.matches(transaction("0.00"))).toBe(true);
  });
  it("leaves names, account text, identifiers with letters, and dates for Synci's search filter", () => {
    for (const query of [undefined, "", "Coffee", "REF-50", "2026-09-25", "Sparebanken"])
      expect(amountSearch(query)).toBeUndefined();
  });
});
