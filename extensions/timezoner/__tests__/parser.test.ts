import { describe, it, expect } from "vitest";
import { parseQuery, parseTimeForZone } from "../src/parser";
import type { ParsedConversionQuery } from "../src/types";

function expectConversion(input: string): ParsedConversionQuery {
  const result = parseQuery(input);
  expect(result?.kind).toBe("conversion");
  if (!result || result.kind !== "conversion") {
    throw new Error(`Expected conversion query for ${input}`);
  }
  return result;
}

describe("parseQuery", () => {
  describe("time with colon + zone", () => {
    it("parses 11:30am PT", () => {
      const r = expectConversion("11:30am PT");
      expect(r).toMatchObject({
        kind: "conversion",
        hour: 11,
        minute: 30,
        sourceLabel: "PT",
      });
      expect(r.sourceTimezone).toBe("America/Los_Angeles");
    });

    it("parses 3:00pm bangkok", () => {
      const r = expectConversion("3:00pm bangkok");
      expect(r).toMatchObject({ hour: 15, minute: 0 });
      expect(r.sourceTimezone).toBe("Asia/Bangkok");
    });

    it("parses 15:00 BKK (24h)", () => {
      const r = expectConversion("15:00 BKK");
      expect(r).toMatchObject({ hour: 15, minute: 0 });
      expect(r.sourceTimezone).toBe("Asia/Bangkok");
    });
  });

  describe("time without colon + zone", () => {
    it("parses 1130am PT", () => {
      const r = expectConversion("1130am PT");
      expect(r).toMatchObject({ hour: 11, minute: 30 });
    });

    it("parses 1130 am PT", () => {
      const r = expectConversion("1130 am PT");
      expect(r).toMatchObject({ hour: 11, minute: 30 });
    });
  });

  describe("hour + am/pm + zone", () => {
    it("parses 3pm SF", () => {
      const r = expectConversion("3pm SF");
      expect(r).toMatchObject({
        kind: "conversion",
        hour: 15,
        minute: 0,
        sourceLabel: "SF",
      });
    });

    it("parses 3 pm sf", () => {
      const r = expectConversion("3 pm sf");
      expect(r).toMatchObject({ hour: 15, minute: 0 });
    });

    it("parses 12am NYC (midnight)", () => {
      const r = expectConversion("12am NYC");
      expect(r).toMatchObject({ hour: 0, minute: 0 });
    });

    it("parses 12pm NYC (noon)", () => {
      const r = expectConversion("12pm NYC");
      expect(r).toMatchObject({ hour: 12, minute: 0 });
    });
  });

  describe("special words", () => {
    it("parses noon NYC", () => {
      const r = expectConversion("noon NYC");
      expect(r).toMatchObject({ hour: 12, minute: 0 });
      expect(r.sourceTimezone).toBe("America/New_York");
    });

    it("parses midnight CET", () => {
      const r = expectConversion("midnight CET");
      expect(r).toMatchObject({ hour: 0, minute: 0 });
      expect(r.sourceTimezone).toBe("Europe/Paris");
    });
  });

  describe("in-context syntax", () => {
    it("parses 3pm in SF as time set in the source zone", () => {
      const r = expectConversion("3pm in SF");
      expect(r).toMatchObject({
        kind: "conversion",
        hour: 15,
        minute: 0,
        sourceLabel: "SF",
      });
      expect(r.sourceTimezone).toBe("America/Los_Angeles");
      expect(r.targetTimezone).toBeUndefined();
    });

    it("parses 11:30 in new york as time set in the source zone", () => {
      const r = expectConversion("11:30 in new york");
      expect(r).toMatchObject({
        kind: "conversion",
        hour: 11,
        minute: 30,
        sourceLabel: "new york",
      });
      expect(r.sourceTimezone).toBe("America/New_York");
    });

    it("parses noon in London as time set in the source zone", () => {
      const r = expectConversion("noon in London");
      expect(r).toMatchObject({
        kind: "conversion",
        hour: 12,
        minute: 0,
        sourceLabel: "London",
      });
      expect(r.sourceTimezone).toBe("Europe/London");
    });

    it("parses a direct IANA zone in search-bar edit syntax", () => {
      const r = expectConversion("4:27 PM in America/Los_Angeles");
      expect(r).toMatchObject({
        kind: "conversion",
        hour: 16,
        minute: 27,
        sourceLabel: "America/Los_Angeles",
        sourceTimezone: "America/Los_Angeles",
      });
    });

    it("parses 1130am BKK in SF", () => {
      const r = expectConversion("1130am BKK in SF");
      expect(r).toMatchObject({
        kind: "conversion",
        hour: 11,
        minute: 30,
        sourceLabel: "BKK",
      });
      expect(r.sourceTimezone).toBe("Asia/Bangkok");
      expect(r.targetTimezone).toBe("America/Los_Angeles");
      expect(r.targetLabel).toBe("SF");
    });

    it("parses 3pm bangkok in new york", () => {
      const r = expectConversion("3pm bangkok in new york");
      expect(r).toMatchObject({ hour: 15, minute: 0 });
      expect(r.targetTimezone).toBe("America/New_York");
    });

    it("parses noon london in tokyo", () => {
      const r = expectConversion("noon london in tokyo");
      expect(r).toMatchObject({ hour: 12, minute: 0 });
      expect(r.targetTimezone).toBe("Asia/Tokyo");
    });
  });

  describe("edge cases", () => {
    it("returns undefined for empty input", () => {
      expect(parseQuery("")).toBeUndefined();
    });

    it("returns undefined for unrecognized input", () => {
      expect(parseQuery("hello world")).toBeUndefined();
    });

    it("returns undefined for time without zone", () => {
      expect(parseQuery("3pm")).toBeUndefined();
    });
  });

  describe("zone commands", () => {
    it("parses +Tokyo", () => {
      expect(parseQuery("+Tokyo")).toEqual({
        kind: "addZone",
        label: "Tokyo",
        timezone: "Asia/Tokyo",
      });
    });

    it("parses add Hong Kong", () => {
      expect(parseQuery("add Hong Kong")).toEqual({
        kind: "addZone",
        label: "Hong Kong",
        timezone: "Asia/Hong_Kong",
      });
    });

    it("parses bare city names as add-zone commands", () => {
      expect(parseQuery("Tokyo")).toEqual({
        kind: "addZone",
        label: "Tokyo",
        timezone: "Asia/Tokyo",
      });
    });

    it("parses bare multi-word city names as add-zone commands", () => {
      expect(parseQuery("Hong Kong")).toEqual({
        kind: "addZone",
        label: "Hong Kong",
        timezone: "Asia/Hong_Kong",
      });
    });

    it("parses -SF", () => {
      expect(parseQuery("-SF")).toEqual({
        kind: "removeZone",
        label: "SF",
      });
    });

    it("parses remove NYC", () => {
      expect(parseQuery("remove NYC")).toEqual({
        kind: "removeZone",
        label: "NYC",
      });
    });
  });
});

describe("parseTimeForZone", () => {
  it("parses a displayed row time for a selected source zone", () => {
    expect(
      parseTimeForZone("4:27 PM", "SF", "America/Los_Angeles"),
    ).toEqual({
      kind: "conversion",
      hour: 16,
      minute: 27,
      sourceLabel: "SF",
      sourceTimezone: "America/Los_Angeles",
    });
  });

  it("parses 24-hour row time for a selected source zone", () => {
    expect(parseTimeForZone("16:05", "Bangkok", "Asia/Bangkok")).toEqual({
      kind: "conversion",
      hour: 16,
      minute: 5,
      sourceLabel: "Bangkok",
      sourceTimezone: "Asia/Bangkok",
    });
  });

  it("parses compact 3-digit time with meridiem for a selected source zone", () => {
    expect(parseTimeForZone("430pm", "SF", "America/Los_Angeles")).toEqual({
      kind: "conversion",
      hour: 16,
      minute: 30,
      sourceLabel: "SF",
      sourceTimezone: "America/Los_Angeles",
    });
  });

  it("parses a bare hour for a selected source zone", () => {
    expect(parseTimeForZone("15", "SF", "America/Los_Angeles")).toEqual({
      kind: "conversion",
      hour: 15,
      minute: 0,
      sourceLabel: "SF",
      sourceTimezone: "America/Los_Angeles",
    });
  });

  it("treats bare 24 as midnight for a selected source zone", () => {
    expect(parseTimeForZone("24", "SF", "America/Los_Angeles")).toEqual({
      kind: "conversion",
      hour: 0,
      minute: 0,
      sourceLabel: "SF",
      sourceTimezone: "America/Los_Angeles",
    });
  });

  it("rejects invalid form time input", () => {
    expect(
      parseTimeForZone("coffee", "SF", "America/Los_Angeles"),
    ).toBeUndefined();
  });

  it("rejects out-of-range bare hours", () => {
    expect(parseTimeForZone("25", "SF", "America/Los_Angeles")).toBeUndefined();
  });
});
