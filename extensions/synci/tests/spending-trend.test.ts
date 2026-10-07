import { describe, expect, it } from "vitest";
import { spendingTrend } from "../src/lib/spending-trend";
import type { Transaction } from "../src/lib/types";

const transaction = (id: number, fields: Partial<Transaction> = {}): Transaction => ({
  id,
  financial_account_id: 1,
  currency: "EUR",
  amount: "-0.10",
  booked: true,
  booking_date: "2026-09-25",
  mapped_fields: { date: "2026-09-24" },
  ...fields,
});
describe("daily spending charts", () => {
  it("uses booking days consistently with the period filter, fills zero days and sums exact amounts", () => {
    const result = spendingTrend(
      [transaction(1), transaction(2, { amount: "-0.20" })],
      "EUR",
      "7",
      new Date(2026, 8, 27),
    );
    expect(result.points).toHaveLength(7);
    expect(result.points.find(({ date }) => date === "2026-09-25")?.amount).toBe("0.3");
    expect(result.points.find(({ date }) => date === "2026-09-24")?.amount).toBe("0");
    expect(result.total).toBe("0.3");
  });
  it("excludes duplicates, pending, inflows, other currencies and dates outside the period", () => {
    const result = spendingTrend(
      [
        transaction(1),
        transaction(1),
        transaction(2, { booked: false }),
        transaction(3, { amount: "5" }),
        transaction(4, { currency: "NOK" }),
        transaction(5, { booking_date: "2026-08-01" }),
        transaction(6, { booking_date: "2026-09-28" }),
        transaction(7, { booking_date: null }),
      ],
      "EUR",
      "month",
      new Date(2026, 8, 27),
    );
    expect(result.total).toBe("0.1");
    expect(result.unplotted).toBe(1);
    expect(result.points).toHaveLength(27);
  });
});
