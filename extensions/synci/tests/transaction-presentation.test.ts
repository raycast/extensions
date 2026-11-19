import { describe, expect, it } from "vitest";
import { transactionGroups } from "../src/lib/transaction-groups";
import { exportTransactions } from "../src/lib/transaction-export";
import type { Transaction } from "../src/lib/types";

const transaction = (id: number, date?: string, fields: Partial<Transaction> = {}): Transaction => ({
  id,
  financial_account_id: 1,
  amount: "-50.25",
  currency: "NOK",
  booked: true,
  mapped_fields: { date, payee: "Coffee" },
  ...fields,
});

describe("transaction day sections", () => {
  it("sorts and deduplicates the loaded set despite mixed API ordering", () => {
    const input = [
      transaction(1, "2026-09-25"),
      transaction(3, "2026-09-27"),
      transaction(2, "2026-09-26"),
      transaction(3, "2026-09-27"),
      transaction(4),
    ];
    const groups = transactionGroups(input, new Date(2026, 8, 27));
    expect(groups.map(({ title }) => title)).toEqual([
      "Today",
      "Yesterday",
      expect.stringContaining("25"),
      "Date Not Reported",
    ]);
    expect(groups.flatMap(({ transactions }) => transactions.map(({ id }) => id))).toEqual([3, 2, 1, 4]);
    expect(input.map(({ id }) => id)).toEqual([1, 3, 2, 3, 4]);
  });
  it("keeps same-day rows together across page boundaries with stable ID ordering", () => {
    const groups = transactionGroups([transaction(1, "2026-09-26"), transaction(2, "2026-09-26")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].transactions.map(({ id }) => id)).toEqual([2, 1]);
  });
});

describe("transaction exports", () => {
  it("preserves exact numeric amounts, currency, mapped dates, and pending status", () => {
    const csv = exportTransactions(
      [transaction(1, "2026-09-25", { amount: "-123456789012.12", booked: false, booking_date: "2026-09-26" })],
      "csv",
    );
    expect(csv).toContain("2026-09-25,Coffee,,-123456789012.12,NOK,Pending");
    expect(csv).not.toContain("2026-09-26");
  });
  it("escapes CSV quotes, commas and newlines while keeping non-ASCII payees", () => {
    const csv = exportTransactions(
      [transaction(1, undefined, { mapped_fields: { payee: 'Øst, "Shop"', description: "A\nB" } })],
      "csv",
    );
    expect(csv).toContain('"Øst, ""Shop""","A\nB"');
  });
  it.each(["=SUM(A1)", "+formula", "@formula", "-formula", "  =formula", "\t=cmd", "\n=cmd"])(
    "neutralizes spreadsheet formulas in text fields: %s",
    (payee) => {
      const csv = exportTransactions([transaction(1, undefined, { mapped_fields: { payee } })], "csv");
      expect(csv).toContain("'" + payee);
      expect(csv).toContain(",-50.25,");
    },
  );
  it("makes spreadsheet clipboard rows unambiguous and exports only the supplied set", () => {
    const tsv = exportTransactions(
      [transaction(1, undefined, { mapped_fields: { payee: "Coffee\tShop", description: "Line 1\nLine 2" } })],
      "tsv",
    );
    expect(tsv).toContain("Coffee Shop\tLine 1 Line 2\t-50.25");
    expect(tsv.trim().split("\r\n")).toHaveLength(2);
    expect(tsv.trim().split("\r\n")[1].split("\t")).toHaveLength(8);
  });
});
