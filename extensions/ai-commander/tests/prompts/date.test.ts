import { describe, expect, it } from "vitest";
import {
  applyDateOffsets,
  formatDatePlaceholder,
  isValidLocale,
  parseDateFormat,
  parseDateOffset,
} from "../../src/prompts/template/date";

// Local constructor on purpose: placeholders render in the system time zone.
const NOW = new Date(2026, 10, 2, 15, 4, 5, 67);

describe("parseDateOffset", () => {
  it("parses single and combined offsets", () => {
    expect(parseDateOffset("+3d")).toEqual([{ amount: 3, unit: "d" }]);
    expect(parseDateOffset("+2y -5M")).toEqual([
      { amount: 2, unit: "y" },
      { amount: -5, unit: "M" },
    ]);
  });

  it("rejects malformed offsets", () => {
    for (const value of ["", " ", "3d", "+ 3d", "+3w", "+3D", "+d", "++3d", "+1234567d"]) {
      expect(parseDateOffset(value), value).toBeUndefined();
    }
  });
});

describe("applyDateOffsets", () => {
  const apply = (date: Date, offset: string) => applyDateOffsets(date, parseDateOffset(offset) ?? []);

  it("tells minutes from months", () => {
    expect(apply(NOW, "+5m").getMinutes()).toBe(9);
    expect(apply(NOW, "+1M").getMonth()).toBe(11);
  });

  it("covers hours, days, years and rollover", () => {
    expect(apply(NOW, "+10h").getDate()).toBe(3);
    expect(apply(NOW, "-3d").getDate()).toBe(30);
    expect(apply(NOW, "+2M").getFullYear()).toBe(2027);
    expect(apply(NOW, "-1y").getFullYear()).toBe(2025);
  });

  it("clamps to the end of a shorter month", () => {
    const result = apply(new Date(2026, 0, 31), "+1M");
    expect([result.getMonth(), result.getDate()]).toEqual([1, 28]);
    const leap = apply(new Date(2024, 1, 29), "+1y");
    expect([leap.getMonth(), leap.getDate()]).toEqual([1, 28]);
  });

  it("does not mutate its input", () => {
    const before = NOW.getTime();
    apply(NOW, "+1y +1M +1d");
    expect(NOW.getTime()).toBe(before);
  });
});

describe("formatDatePlaceholder", () => {
  it("defaults to en-US", () => {
    expect(formatDatePlaceholder("date", NOW)).toBe("November 2, 2026");
    expect(formatDatePlaceholder("day", NOW)).toBe("Monday");
    expect(formatDatePlaceholder("time", NOW)).toMatch(/^3:04\sPM$/);
    expect(formatDatePlaceholder("datetime", NOW)).toContain("2026");
  });

  it("honours the locale", () => {
    expect(formatDatePlaceholder("date", NOW, { locale: "de-DE" })).toBe("2. November 2026");
    expect(formatDatePlaceholder("day", NOW, { locale: "de-DE" })).toBe("Montag");
    expect(formatDatePlaceholder("time", NOW, { locale: "en-US-u-hc-h23" })).toBe("15:04");
  });

  it("formats patterns", () => {
    const format = (pattern: string, locale?: string) =>
      formatDatePlaceholder("date", NOW, { format: pattern, locale });
    expect(format("yyyy-MM-dd")).toBe("2026-11-02");
    expect(format("yy/M/d")).toBe("26/11/2");
    expect(format("HH:mm:ss.SSS")).toBe("15:04:05.067");
    expect(format("h:mm a")).toBe("3:04 PM");
    expect(format("EEE, MMM d")).toBe("Mon, Nov 2");
    expect(format("EEEE, MMMM")).toBe("Monday, November");
    expect(format("EEEE d. MMMM", "de-DE")).toBe("Montag 2. November");
  });

  it("handles twelve o'clock", () => {
    expect(formatDatePlaceholder("time", new Date(2026, 0, 1, 0, 30), { format: "h:mm a" })).toBe("12:30 AM");
  });

  it("prints quoted text literally", () => {
    expect(formatDatePlaceholder("date", NOW, { format: "'Day' d 'o''clock' ''" })).toBe("Day 2 o'clock '");
  });

  it("combines offset and format", () => {
    expect(formatDatePlaceholder("date", NOW, { offset: "+1d", format: "yyyy-MM-dd" })).toBe("2026-11-03");
  });

  it("throws on invalid options", () => {
    expect(() => formatDatePlaceholder("date", NOW, { format: "YYYY" })).toThrow(RangeError);
    expect(() => formatDatePlaceholder("date", NOW, { offset: "soon" })).toThrow(RangeError);
    expect(() => formatDatePlaceholder("date", NOW, { locale: "de_DE" })).toThrow(RangeError);
    expect(() => formatDatePlaceholder("date", NOW, { offset: "+999999y" })).toThrow(RangeError);
  });
});

describe("format and locale checks", () => {
  it("rejects unsupported formats", () => {
    for (const format of ["YYYY", "DD", "yyyyy", "'open", "Q"]) expect(parseDateFormat(format), format).toBeUndefined();
  });

  it("recognizes locales", () => {
    expect(isValidLocale("fr-FR")).toBe(true);
    expect(isValidLocale("en-US-u-hc-h23")).toBe(true);
    expect(isValidLocale("en_US")).toBe(false);
    expect(isValidLocale("not a locale")).toBe(false);
  });
});
