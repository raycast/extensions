import { describe, expect, it } from "vitest";
import { detailFields, transactionMetadata } from "../src/lib/transaction-details";
import { money } from "../src/lib/format";
import type { Transaction } from "../src/lib/types";

const transaction: Transaction = {
  id: 42,
  financial_account_id: 7,
  amount: "-50.25",
  currency: "NOK",
  booked: false,
  booking_date: "2026-09-25",
  mapped_fields: { payee: "Coffee", description: "Breakfast" },
};

describe("transaction details", () => {
  it("puts main fields before every additional API field, including unrecognized fields", () => {
    const result = transactionMetadata({
      ...transaction,
      value_date: null,
      bank_specific_data: { reference: "TEST-REF", parts: [{ amount: "0", settled: false }] },
    });
    expect(result[0]).toEqual(["Payee", "Coffee"]);
    expect(result).toContainEqual(["Currency", "NOK"]);
    expect(result).toContainEqual(["Status", "Pending"]);
    expect(result).toContainEqual(["Value Date", "Not reported"]);
    expect(result).toContainEqual(["Bank Specific Data › Reference", "TEST-REF"]);
    expect(result).toContainEqual(["Bank Specific Data › Parts › Item 1 › Settled", "false"]);
    expect(result).toContainEqual(["Bank Specific Data › Parts › Item 1 › Amount", "0"]);
  });

  it("omits relationship payloads and empty optional fields while retaining transaction data", () => {
    const result = transactionMetadata({
      ...transaction,
      financial_account: {
        id: 7,
        enabled: true,
        name: "Checking",
        financial_connection: {
          id: 5,
          enabled: true,
          institution: { id: 6, name: "Example Bank" },
        },
      },
      transfer_logs: [{ id: 9, status: "FAILED" }],
      failed_transfers: 1,
      booking_datetime: null,
      codes: { merchant_category_code: "5812" },
      currency_exchange: { exchange_rate: "1.23" },
    });
    expect(result).toContainEqual(["Account", "Checking"]);
    expect(result).toContainEqual(["Institution", "Example Bank"]);
    expect(result).toContainEqual(["Codes › Merchant Category Code", "5812"]);
    expect(result).toContainEqual(["Currency Exchange › Exchange Rate", "1.23"]);
    expect(
      result.some(([key]) =>
        /Financial Account|Financial Connection|Transfer|Booking Datetime|Mapped Fields/.test(key),
      ),
    ).toBe(false);
  });

  it("preserves zero, false, null, empty strings, arrays, and objects", () => {
    expect(detailFields({ a: 0, b: false, c: null, d: "", e: [], f: {} })).toEqual([
      ["A", "0"],
      ["B", "false"],
      ["C", "Not reported"],
      ["D", '""'],
      ["E", "[]"],
      ["F", "{}"],
    ]);
  });

  it("passes field values unchanged to native text labels", () => {
    const unsafe = "![logo](https://tracker.test/image) | <img src=x>";
    const result = transactionMetadata({ ...transaction, additional_data: { note: unsafe } });
    expect(result).toContainEqual(["Additional Data › Note", unsafe]);
  });
});

describe("localized currency amounts", () => {
  const normalize = (text: string) => text.replace(/[\u00a0\u202f]/g, " ");
  it("uses locale-specific symbols, placement, and separators", () => {
    expect(normalize(money("-50.25", "NOK", "en-US"))).toBe("-kr 50.25");
    expect(normalize(money("-1234.5", "NOK", "nb-NO"))).toBe("−1 234,50 kr");
    expect(money("1234.5", "EUR", "en-US")).toBe("€1,234.50");
  });
  it("respects currencies with different minor units", () => {
    expect(money("1234", "JPY", "en-US")).toBe("¥1,234");
    expect(normalize(money("1.234", "KWD", "en-US"))).toBe("KWD 1.234");
  });
});
