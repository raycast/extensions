import { describe, expect, it } from "vitest";
import { groupDigits, numberToWords, parseDate, toGregorian, toJalali } from "../src/lib/persian-tools";

describe("number to words", () => {
  it("writes numbers in Persian", () => {
    expect(numberToWords("0")).toBe("صفر");
    expect(numberToWords("۱۲۵")).toBe("صد و بیست و پنج");
    expect(numberToWords("1000")).toBe("هزار");
    expect(numberToWords("2,500,013")).toBe("دو میلیون و پانصد هزار و سیزده");
    expect(numberToWords("-17")).toBe("منفی هفده");
    expect(numberToWords("2.5")).toBe("دو و پنج دهم");
    expect(numberToWords("0.25")).toBe("بیست و پنج صدم");
    expect(numberToWords("0.1234")).toBe("هزار و دویست و سی و چهار ده‌هزارم");
    expect(numberToWords("0.0001")).toBe("یک ده‌هزارم");
    expect(numberToWords("hello")).toBeNull();
    expect(numberToWords("1234567890123456789")).toBeNull();
    expect(numberToWords("0.1234567")).toBeNull();
  });

  it("groups digits", () => {
    expect(groupDigits("1234567", false)).toBe("1,234,567");
    expect(groupDigits("1234567", true)).toBe("۱٬۲۳۴٬۵۶۷");
  });
});

describe("dates", () => {
  it("converts between calendars", () => {
    expect(toJalali({ year: 2026, month: 10, day: 28 })).toEqual({ year: 1405, month: 8, day: 6 });
    expect(toGregorian({ year: 1405, month: 8, day: 6 })).toEqual({ year: 2026, month: 10, day: 28 });
    expect(toGregorian({ year: 1403, month: 1, day: 1 })).toEqual({ year: 2024, month: 3, day: 20 });
    expect(toGregorian({ year: 1402, month: 12, day: 29 })).toEqual({ year: 2024, month: 3, day: 19 });
  });

  it("round-trips every day of a year", () => {
    for (let day = 0; day < 366; day++) {
      const d = new Date(Date.UTC(2025, 0, 1) + day * 86_400_000);
      const g = { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
      expect(toGregorian(toJalali(g))).toEqual(g);
    }
  });

  it("parses dates in both calendars", () => {
    expect(parseDate("۱۴۰۵/۰۸/۰۶")).toEqual({ date: { year: 1405, month: 8, day: 6 }, calendar: "jalali" });
    expect(parseDate("2026-10-28")?.calendar).toBe("gregorian");
    expect(parseDate("2026-02-30")).toBeNull();
    expect(parseDate("2026-04-31")).toBeNull();
    expect(parseDate("not a date")).toBeNull();
  });
});
