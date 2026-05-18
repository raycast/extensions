import { describe, expect, it } from "vitest";
import { commafy } from "./commafy";

describe("commafy() — default options", () => {
  const cases: [string, string][] = [
    // basics
    ["1234", "1,234"],
    ["12345", "12,345"],
    ["123456", "123,456"],
    ["1234567", "1,234,567"],
    ["1234567890", "1,234,567,890"],
    ["123", "123"],
    ["12", "12"],
    ["0", "0"],
    // negative
    ["-1234", "-1,234"],
    ["-1234567", "-1,234,567"],
    ["価格は-1500円です", "価格は-1,500円です"],
    // decimal — left alone by default
    ["1234.56", "1234.56"],
    ["0.1234", "0.1234"],
    // already formatted
    ["1,234", "1,234"],
    ["1,234,567", "1,234,567"],
    ["1,234.56", "1,234.56"],
    // hyphen / slash — phone & date (both forms)
    ["090-1234-5678", "090-1234-5678"],
    ["03-1234-5678", "03-1234-5678"],
    ["2026-05-18", "2026-05-18"],
    ["1999-12-31", "1999-12-31"],
    ["2026-5-8", "2026-5-8"],
    ["2026/05/18", "2026/05/18"],
    ["1999/12/31", "1999/12/31"],
    ["納期は2026/05/18です", "納期は2026/05/18です"],
    // leading-zero tokens — ZIP / account IDs left alone
    ["01234", "01234"],
    ["007", "007"],
    ["01234567", "01234567"],
    ["-01234", "-01234"],
    // underscore-separated numeric literals — left alone (Python-style)
    ["12345_6789", "12345_6789"],
    ["1234_5", "1234_5"],
    // 年
    ["2026年", "2026年"],
    ["1980年代", "1980年代"],
    ["12345年", "12345年"],
    // mixed
    ["売上は1234567円、利益は-50000円でした", "売上は1,234,567円、利益は-50,000円でした"],
    ["連絡先: 090-1234-5678 / 売上 1500000", "連絡先: 090-1234-5678 / 売上 1,500,000"],
    ["2026年に売上が1234567円増えた", "2026年に売上が1,234,567円増えた"],
    ["納期2026-05-18、見積1234567円", "納期2026-05-18、見積1,234,567円"],
    // edge
    ["", ""],
    ["こんにちは", "こんにちは"],
    ["(1234)", "(1,234)"],
  ];

  it.each(cases)("%j → %j", (input, expected) => {
    expect(commafy(input).text).toBe(expected);
  });

  it("returns a count of transformed tokens", () => {
    expect(commafy("売上 1234567 / 利益 -50000").count).toBe(2);
    expect(commafy("こんにちは").count).toBe(0);
    expect(commafy("1234.56 / 1,234 / 090-1234-5678").count).toBe(0);
  });
});

describe("commafy() — ASCII letter boundary", () => {
  const cases: [string, string][] = [
    // Direct identifiers — left alone
    ["SKU1234A", "SKU1234A"],
    ["SKU1234", "SKU1234"],
    ["v1234", "v1234"],
    ["v12345.6", "v12345.6"],
    ["abc12345xyz", "abc12345xyz"],
    // Connector-style identifiers — left alone
    ["INV-1234567", "INV-1234567"],
    ["SKU_12345", "SKU_12345"],
    ["ABC/12345", "ABC/12345"],
    ["foo-12345-bar", "foo-12345-bar"],
    ["1234-ABC", "1234-ABC"],
    ["1234_XYZ", "1234_XYZ"],
    // Scientific notation — left alone (full mantissa preserved, no partial-match backtracking)
    ["1234e5", "1234e5"],
    ["12345e6", "12345e6"],
    ["123456e7", "123456e7"],
    ["1.23e10", "1.23e10"],
    ["-1234e2", "-1234e2"],
    ["1.23e-10", "1.23e-10"],
    ["1234567E+8", "1234567E+8"],
    // Letters immediately following digits — also left alone (no greedy backtrack to "1234")
    ["12345abc", "12345abc"],
    ["1234ABC", "1234ABC"],
    // Letters immediately PRECEDING digits — regression: must NOT partial-match the digit run
    ["abc12345", "abc12345"],
    ["abc123456", "abc123456"],
    ["abc1234567", "abc1234567"],
    ["SKU12345A", "SKU12345A"],
    ["SKU123456A", "SKU123456A"],
    // Non-letter neighbours — transform
    ["売上1234567円", "売上1,234,567円"],
    ["(1234)", "(1,234)"],
    ["1234円", "1,234円"],
    ["#1234", "#1,234"],
    ["1234%", "1,234%"],
    ["売上 -1234円", "売上 -1,234円"],
  ];
  it.each(cases)("%j → %j", (input, expected) => {
    expect(commafy(input).text).toBe(expected);
  });
});

describe("commafy() — minDigits option", () => {
  it("minDigits=3 — 3-digit numbers don't actually need commas, so output is unchanged", () => {
    expect(commafy("123", { minDigits: 3 }).text).toBe("123");
    expect(commafy("1234", { minDigits: 3 }).text).toBe("1,234");
  });

  it("minDigits=7 only formats 7+ digit numbers", () => {
    expect(commafy("1234567", { minDigits: 7 }).text).toBe("1,234,567");
    expect(commafy("123456", { minDigits: 7 }).text).toBe("123456");
  });

  it("falls back to default when minDigits is invalid", () => {
    expect(commafy("1234", { minDigits: 0 }).text).toBe("1,234");
    expect(commafy("1234", { minDigits: -1 }).text).toBe("1,234");
    expect(commafy("1234", { minDigits: NaN }).text).toBe("1,234");
  });

  it("floors fractional minDigits to an integer", () => {
    expect(commafy("1234", { minDigits: 4.9 }).text).toBe("1,234");
    expect(commafy("123", { minDigits: 3.5 }).text).toBe("123");
  });
});

describe("commafy() — separator option", () => {
  it("uses underscore", () => {
    expect(commafy("1234567", { separator: "_" }).text).toBe("1_234_567");
  });
  it("uses space", () => {
    expect(commafy("1234567", { separator: " " }).text).toBe("1 234 567");
  });
  it("uses period (european style)", () => {
    expect(commafy("1234567", { separator: "." }).text).toBe("1.234.567");
  });
  it("safely handles separators containing regex-replacement specials ($, \\)", () => {
    expect(commafy("1234567", { separator: "$" }).text).toBe("1$234$567");
    expect(commafy("1234567", { separator: "$&" }).text).toBe("1$&234$&567");
    expect(commafy("1234567", { separator: "$1" }).text).toBe("1$1234$1567");
    expect(commafy("1234567", { separator: "\\" }).text).toBe("1\\234\\567");
  });
  it("supports multi-character separators", () => {
    expect(commafy("1234567", { separator: ", " }).text).toBe("1, 234, 567");
  });
  it("falls back to comma when separator is empty / undefined", () => {
    expect(commafy("1234567", { separator: "" }).text).toBe("1,234,567");
    expect(commafy("1234567", { separator: undefined as unknown as string }).text).toBe("1,234,567");
  });
});

describe("commafy() — includeDecimals option", () => {
  it("formats the integer portion of decimal numbers", () => {
    expect(commafy("1234.56", { includeDecimals: true }).text).toBe("1,234.56");
    expect(commafy("12345678.9", { includeDecimals: true }).text).toBe("12,345,678.9");
  });
  it("leaves the fractional portion untouched", () => {
    expect(commafy("1234.56789", { includeDecimals: true }).text).toBe("1,234.56789");
  });
  it("still skips scientific notation with includeDecimals=true (no partial backtrack)", () => {
    expect(commafy("12345.67e8", { includeDecimals: true }).text).toBe("12345.67e8");
    expect(commafy("12345e6", { includeDecimals: true }).text).toBe("12345e6");
  });
  it("silently disables includeDecimals when separator is a period (ambiguity guard)", () => {
    // would otherwise produce "1.234.56" which collides with the decimal point
    expect(commafy("1234.56", { includeDecimals: true, separator: "." }).text).toBe("1234.56");
    expect(commafy("1234567", { includeDecimals: true, separator: "." }).text).toBe("1.234.567");
  });
});

describe("commafy() — excludeYears option", () => {
  it("with excludeYears=false, 年 tokens get commas", () => {
    expect(commafy("2026年", { excludeYears: false }).text).toBe("2,026年");
  });
});

describe("commafy() — excludeHyphenated option", () => {
  it("with excludeHyphenated=false, hyphenated numbers get commas", () => {
    expect(commafy("2026-05-18", { excludeHyphenated: false }).text).toBe("2,026-05-18");
  });
});

describe("commafy() — invalid partial grouped tokens are not 'rescued'", () => {
  // "1234,567" is NOT a valid 3-3 grouped number — leave it alone (default separator).
  it.each([
    ["1234,567", "1234,567"],
    ["a 1234,567 b", "a 1234,567 b"],
    ["1234,5678", "1234,5678"],
  ])("default separator: %j → %j", (input, expected) => {
    expect(commafy(input).text).toBe(expected);
  });

  // Same guard with a custom separator: "1234_567" with separator "_" must stay as-is.
  it.each([
    ["1234_567", "1234_567"],
    ["1234_5678", "1234_5678"],
  ])('separator="_": %j → %j', (input, expected) => {
    expect(commafy(input, { separator: "_" }).text).toBe(expected);
  });

  // Already-formatted in the user's chosen separator is idempotent.
  it("idempotent with custom separator", () => {
    expect(commafy("1_234_567", { separator: "_" }).text).toBe("1_234_567");
    expect(commafy("1 234 567", { separator: " " }).text).toBe("1 234 567");
  });

  // Universal comma exclusion: even when separator is "_", we don't touch "1,234".
  it('respects existing "1,234" formatting regardless of selected separator', () => {
    expect(commafy("売上1,234円", { separator: "_" }).text).toBe("売上1,234円");
  });
});
