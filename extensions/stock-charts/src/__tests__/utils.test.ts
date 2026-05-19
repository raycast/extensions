import { describe, it, expect } from "vitest";

import {
  formatMoney,
  formatChange,
  changeIcon,
  changeColor,
  normalizeCurrency,
} from "../utils";

describe("formatMoney", () => {
  it("formats trillions with T suffix and currency code", () => {
    expect(formatMoney(3070000000000, "USD")).toBe("$3.07T USD");
  });

  it("formats millions with M suffix and currency code", () => {
    expect(formatMoney(52300000, "USD")).toBe("$52.30M USD");
  });

  it("formats thousands with k suffix and currency code", () => {
    expect(formatMoney(1500, "USD")).toBe("$1.50k USD");
  });

  it("formats regular values with currency code", () => {
    expect(formatMoney(198.42, "USD")).toBe("$198.42 USD");
  });

  it("returns dash for undefined", () => {
    expect(formatMoney(undefined)).toBe("—");
  });

  it("returns dash for null", () => {
    expect(formatMoney(null)).toBe("—");
  });

  it("returns dash for NaN", () => {
    expect(formatMoney(NaN)).toBe("—");
  });

  it("formats EUR with € symbol and code", () => {
    expect(formatMoney(42.5, "EUR")).toBe("€42.50 EUR");
  });

  it("formats GBP with £ symbol and code", () => {
    expect(formatMoney(123.45, "GBP")).toBe("£123.45 GBP");
  });

  it("formats JPY with ¥ symbol and code", () => {
    expect(formatMoney(15000, "JPY")).toBe("¥15.00k JPY");
  });

  it("converts GBp (pence) to GBP and divides by 100", () => {
    expect(formatMoney(15050, "GBp")).toBe("£150.50 GBP");
  });

  it("converts ILA (agorot) to ILS and divides by 100", () => {
    expect(formatMoney(5000, "ILA")).toContain("50.00 ILS");
  });

  it("converts ZAc (cents) to ZAR and divides by 100", () => {
    expect(formatMoney(12345, "ZAc")).toContain("123.45 ZAR");
  });

  it("disambiguates USD from CAD", () => {
    expect(formatMoney(100, "USD")).toBe("$100.00 USD");
    expect(formatMoney(100, "CAD")).toBe("CA$100.00 CAD");
  });
});

describe("normalizeCurrency", () => {
  it("maps GBp to GBP", () => {
    expect(normalizeCurrency("GBp")).toBe("GBP");
  });

  it("maps ILA to ILS", () => {
    expect(normalizeCurrency("ILA")).toBe("ILS");
  });

  it("passes through standard codes unchanged", () => {
    expect(normalizeCurrency("USD")).toBe("USD");
    expect(normalizeCurrency("EUR")).toBe("EUR");
    expect(normalizeCurrency("JPY")).toBe("JPY");
  });
});

describe("formatChange", () => {
  it("formats positive USD change with currency code", () => {
    expect(formatChange(1.23, 0.62)).toBe("+$1.23 USD (+0.62%)");
  });

  it("formats negative USD change with currency code", () => {
    expect(formatChange(-0.15, -1.0)).toBe("-$0.15 USD (-1.00%)");
  });

  it("formats EUR change with € symbol and code", () => {
    expect(formatChange(2.5, 1.1, "EUR")).toBe("+€2.50 EUR (+1.10%)");
  });

  it("formats GBP change with £ symbol and code", () => {
    expect(formatChange(-3.0, -0.8, "GBP")).toBe("-£3.00 GBP (-0.80%)");
  });

  it("converts GBp (pence) to GBP for display", () => {
    expect(formatChange(150, 1.5, "GBp")).toBe("+£1.50 GBP (+1.50%)");
  });

  it("returns dash for undefined values", () => {
    expect(formatChange(undefined, undefined)).toBe("—");
  });

  it("returns dash when only change is undefined", () => {
    expect(formatChange(undefined, 0.5)).toBe("—");
  });

  it("returns dash when only changePercent is undefined", () => {
    expect(formatChange(1.0, undefined)).toBe("—");
  });

  it("returns dash for NaN values", () => {
    expect(formatChange(NaN, NaN)).toBe("—");
  });
});

describe("changeIcon", () => {
  it("returns ArrowUp with green for positive change", () => {
    const icon = changeIcon(1.5);
    expect(icon.source).toBe("arrow-up");
    expect(icon.tintColor).toBe("green");
  });

  it("returns ArrowDown with red for negative change", () => {
    const icon = changeIcon(-0.5);
    expect(icon.source).toBe("arrow-down");
    expect(icon.tintColor).toBe("red");
  });

  it("returns Dot with PrimaryText for zero", () => {
    const icon = changeIcon(0);
    expect(icon.source).toBe("dot");
    expect(icon.tintColor).toBe("primary");
  });

  it("returns Dot with PrimaryText for undefined", () => {
    const icon = changeIcon(undefined);
    expect(icon.source).toBe("dot");
    expect(icon.tintColor).toBe("primary");
  });
});

describe("changeColor", () => {
  it("returns Green for positive change", () => {
    expect(changeColor(2.0)).toBe("green");
  });

  it("returns Red for negative change", () => {
    expect(changeColor(-1.0)).toBe("red");
  });

  it("returns PrimaryText for zero", () => {
    expect(changeColor(0)).toBe("primary");
  });

  it("returns PrimaryText for undefined", () => {
    expect(changeColor(undefined)).toBe("primary");
  });
});
