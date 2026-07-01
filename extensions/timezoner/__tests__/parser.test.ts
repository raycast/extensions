import { describe, it, expect } from "vitest";
import { parseQuery } from "../src/parser";

describe("parseQuery", () => {
  describe("time with colon + zone", () => {
    it("parses 11:30am PT", () => {
      const r = parseQuery("11:30am PT");
      expect(r).toMatchObject({
        kind: "conversion",
        hour: 11,
        minute: 30,
        sourceLabel: "PT",
      });
      expect(r?.sourceTimezone).toBe("America/Los_Angeles");
    });

    it("parses 3:00pm bangkok", () => {
      const r = parseQuery("3:00pm bangkok");
      expect(r).toMatchObject({ hour: 15, minute: 0 });
      expect(r?.sourceTimezone).toBe("Asia/Bangkok");
    });

    it("parses 15:00 BKK (24h)", () => {
      const r = parseQuery("15:00 BKK");
      expect(r).toMatchObject({ hour: 15, minute: 0 });
      expect(r?.sourceTimezone).toBe("Asia/Bangkok");
    });
  });

  describe("time without colon + zone", () => {
    it("parses 1130am PT", () => {
      const r = parseQuery("1130am PT");
      expect(r).toMatchObject({ hour: 11, minute: 30 });
    });

    it("parses 1130 am PT", () => {
      const r = parseQuery("1130 am PT");
      expect(r).toMatchObject({ hour: 11, minute: 30 });
    });
  });

  describe("hour + am/pm + zone", () => {
    it("parses 3pm SF", () => {
      const r = parseQuery("3pm SF");
      expect(r).toMatchObject({
        kind: "conversion",
        hour: 15,
        minute: 0,
        sourceLabel: "SF",
      });
    });

    it("parses 3 pm sf", () => {
      const r = parseQuery("3 pm sf");
      expect(r).toMatchObject({ hour: 15, minute: 0 });
    });

    it("parses 12am NYC (midnight)", () => {
      const r = parseQuery("12am NYC");
      expect(r).toMatchObject({ hour: 0, minute: 0 });
    });

    it("parses 12pm NYC (noon)", () => {
      const r = parseQuery("12pm NYC");
      expect(r).toMatchObject({ hour: 12, minute: 0 });
    });
  });

  describe("special words", () => {
    it("parses noon NYC", () => {
      const r = parseQuery("noon NYC");
      expect(r).toMatchObject({ hour: 12, minute: 0 });
      expect(r?.sourceTimezone).toBe("America/New_York");
    });

    it("parses midnight CET", () => {
      const r = parseQuery("midnight CET");
      expect(r).toMatchObject({ hour: 0, minute: 0 });
      expect(r?.sourceTimezone).toBe("Europe/Paris");
    });
  });

  describe("in-context syntax", () => {
    it("parses 1130am BKK in SF", () => {
      const r = parseQuery("1130am BKK in SF");
      expect(r).toMatchObject({
        kind: "conversion",
        hour: 11,
        minute: 30,
        sourceLabel: "BKK",
      });
      expect(r?.sourceTimezone).toBe("Asia/Bangkok");
      expect(r?.targetTimezone).toBe("America/Los_Angeles");
      expect(r?.targetLabel).toBe("SF");
    });

    it("parses 3pm bangkok in new york", () => {
      const r = parseQuery("3pm bangkok in new york");
      expect(r).toMatchObject({ hour: 15, minute: 0 });
      expect(r?.targetTimezone).toBe("America/New_York");
    });

    it("parses noon london in tokyo", () => {
      const r = parseQuery("noon london in tokyo");
      expect(r).toMatchObject({ hour: 12, minute: 0 });
      expect(r?.targetTimezone).toBe("Asia/Tokyo");
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
