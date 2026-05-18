import { describe, expect, it } from "vitest";
import { formatWithJapaneseUnits } from "./japanese-units";

describe("formatWithJapaneseUnits() — default (no internal commas)", () => {
  const cases: [string, string][] = [
    // below 10000 — untouched
    ["0", "0"],
    ["999", "999"],
    ["1234", "1234"],
    ["9999", "9999"],
    // 万 range
    ["10000", "1万"],
    ["12345", "1万2345"],
    ["123456", "12万3456"],
    ["1234567", "123万4567"],
    ["12345678", "1234万5678"],
    // 億 range
    ["100000000", "1億"],
    ["100010000", "1億1万"],
    ["100002345", "1億2345"],
    ["100050001", "1億5万1"],
    ["123456789", "1億2345万6789"],
    ["1234567890", "12億3456万7890"],
    ["12345678901", "123億4567万8901"],
    ["123456789012", "1234億5678万9012"],
    // 兆 range
    ["1234567890123", "1兆2345億6789万123"],
    // 京 / 垓 / 秭 ranges (rare but supported)
    ["12345678901234567", "1京2345兆6789億123万4567"],
    ["123456789012345678901", "1垓2345京6789兆123億4567万8901"],
    // negative
    ["-12345678", "-1234万5678"],
    // mixed with year (excluded)
    ["2026年に売上が123456789円増えた", "2026年に売上が1億2345万6789円増えた"],
    // mixed with date (excluded — hyphen and slash)
    ["2026-05-18に12345678円", "2026-05-18に1234万5678円"],
    ["2026/05/18に12345678円", "2026/05/18に1234万5678円"],
    // leading-zero — ZIP / IDs left alone
    ["01234567", "01234567"],
    // underscore numeric literal — left alone
    ["12345_6789", "12345_6789"],
    // mixed with already-formatted (excluded)
    ["1,234,567円", "1,234,567円"],
    // edges
    ["", ""],
    ["こんにちは", "こんにちは"],
  ];

  it.each(cases)("%j → %j", (input, expected) => {
    expect(formatWithJapaneseUnits(input).text).toBe(expected);
  });

  it("counts transformed tokens", () => {
    expect(formatWithJapaneseUnits("12345678 と 1234567").count).toBe(2);
    expect(formatWithJapaneseUnits("123").count).toBe(0);
  });
});

describe("formatWithJapaneseUnits() — boundary", () => {
  const cases: [string, string][] = [
    // Direct identifiers
    ["SKU12345A", "SKU12345A"],
    ["v12345", "v12345"],
    // Scientific notation — left alone (full mantissa, no backtracking partial)
    ["12345e6", "12345e6"],
    ["123456e7", "123456e7"],
    ["12345.67e8", "12345.67e8"],
    // Letters following digits — left alone
    ["12345abc", "12345abc"],
    ["123456abc", "123456abc"],
    // Letters preceding digits — regression: must NOT partial-match
    ["abc12345", "abc12345"],
    ["abc123456", "abc123456"],
    // Connector-style identifiers — left alone
    ["INV-12345678", "INV-12345678"],
    ["SKU_12345", "SKU_12345"],
    ["ABC/12345", "ABC/12345"],
    // Non-letter neighbours — transform
    ["売上12345円", "売上1万2345円"],
    ["#12345", "#1万2345"],
  ];
  it.each(cases)("%j → %j", (input, expected) => {
    expect(formatWithJapaneseUnits(input).text).toBe(expected);
  });
});

describe("formatWithJapaneseUnits() — withInternalCommas", () => {
  it("inserts commas within 4-digit groups", () => {
    expect(formatWithJapaneseUnits("12345678", { withInternalCommas: true }).text).toBe("1,234万5,678");
    expect(formatWithJapaneseUnits("1234567890", { withInternalCommas: true }).text).toBe("12億3,456万7,890");
  });
});

describe("formatWithJapaneseUnits() — exclusion toggles", () => {
  it("excludeYears=false formats year tokens too", () => {
    expect(formatWithJapaneseUnits("12345年", { excludeYears: false }).text).toBe("1万2345年");
  });
});
