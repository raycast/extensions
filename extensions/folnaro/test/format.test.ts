import { describe, expect, it } from "vitest";
import { buildLines } from "../src/lib/draft";
import { centsFromDecimal, formatDate, isoDay, parseAmountInput, parseDecimalInput } from "../src/lib/format";
import { translator } from "../src/lib/i18n";

describe("Amounts", () => {
  it("reads what people type, German and English", () => {
    expect(parseAmountInput("49,90")).toBe("49.90");
    expect(parseAmountInput("1.234,5")).toBe("1234.50");
    expect(parseAmountInput("1,234.56")).toBe("1234.56");
    expect(parseAmountInput("95 €")).toBe("95.00");
    expect(parseAmountInput("12,345")).toBeUndefined();
    expect(parseAmountInput("abc")).toBeUndefined();
    expect(parseDecimalInput("2,5")).toBe("2.5");
    expect(parseDecimalInput("77.8855")).toBe("77.8855");
    expect(parseDecimalInput("-1")).toBeUndefined();
  });

  it("converts decimal strings to cents without floating point", () => {
    expect(centsFromDecimal("1234.56")).toBe(123456);
    expect(centsFromDecimal("0.1")).toBe(10);
    expect(centsFromDecimal("-5.05")).toBe(-505);
  });

  it("formats dates per language", () => {
    expect(formatDate("2026-10-16", "de")).toBe("16.10.2026");
    expect(formatDate("2026-10-16", "en")).toBe("Oct 16, 2026");
    expect(isoDay(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("Invoice draft lines", () => {
  const t = translator("en");
  it("builds net lines for documents_create_draft", () => {
    const result = buildLines(
      { "title-0": "Design workshop", "quantity-0": "2,5", "unit-0": "HUR", "price-0": "95", "tax-0": "19" },
      [{ key: 0 }],
      t,
    );
    expect(result.lines).toEqual([
      { kind: "item", title: "Design workshop", quantity: "2.5", unit: "HUR", unit_price: "95", tax_rate: "19" },
    ]);
  });

  it("names every field that does not fit", () => {
    const result = buildLines({ "title-0": "", "quantity-0": "x", "price-0": "" }, [{ key: 0 }], t);
    expect(result.lines).toBeUndefined();
    expect(Object.keys(result.errors).sort()).toEqual(["price-0", "quantity-0", "title-0"]);
  });
});
