import { describe, expect, it } from "vitest";
import { formatLongDate, formatMoney, formatQuantity, formatShortDate } from "./format";

describe("formatMoney", () => {
  it("uses German conventions for de-DE", () => {
    expect(formatMoney(7980, "EUR", "de-DE").replace(/\u00A0/g, " ")).toBe("7.980,00 €");
  });

  it("uses US conventions for en-US", () => {
    expect(formatMoney(7980, "EUR", "en-US").replace(/\u00A0/g, " ")).toBe("€7,980.00");
  });

  it("honours the currency instead of assuming euros", () => {
    expect(formatMoney(100, "CHF", "de-DE")).toContain("CHF");
    expect(formatMoney(100, "USD", "en-US")).toContain("$");
  });

  it("keeps amount and symbol on one line", () => {
    // A line break between "7.980,00" and "€" would look broken in the renderer.
    expect(formatMoney(7980, "EUR", "de-DE")).not.toMatch(/ /);
    expect(formatMoney(7980, "EUR", "de-DE")).toContain("\u00A0");
  });
});

describe("date formatting", () => {
  const date = new Date("2026-08-07T12:00:00Z");

  it("formats short dates per locale", () => {
    expect(formatShortDate(date, "de-DE")).toBe("07.08.26");
    expect(formatShortDate(date, "en-US")).toBe("08/07/26");
  });

  it("formats long dates per locale", () => {
    expect(formatLongDate(date, "de-DE")).toBe("07.08.2026");
    expect(formatLongDate(date, "en-US")).toBe("08/07/2026");
  });
});

describe("formatQuantity", () => {
  it("formats quantities per locale", () => {
    expect(formatQuantity(1234.5, "de-DE")).toBe("1.234,5");
    expect(formatQuantity(1234.5, "en-US")).toBe("1,234.5");
  });
});
