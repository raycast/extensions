import { describe, it, expect } from "vitest";
import { resolveTimezone, resolveZones } from "../src/aliases";

describe("resolveTimezone", () => {
  it("resolves city abbreviations", () => {
    expect(resolveTimezone("SF")).toBe("America/Los_Angeles");
    expect(resolveTimezone("NYC")).toBe("America/New_York");
    expect(resolveTimezone("BKK")).toBe("Asia/Bangkok");
    expect(resolveTimezone("HK")).toBe("Asia/Hong_Kong");
  });

  it("resolves city names", () => {
    expect(resolveTimezone("bangkok")).toBe("Asia/Bangkok");
    expect(resolveTimezone("san francisco")).toBe("America/Los_Angeles");
    expect(resolveTimezone("new york")).toBe("America/New_York");
    expect(resolveTimezone("ho chi minh")).toBe("Asia/Ho_Chi_Minh");
  });

  it("resolves country names", () => {
    expect(resolveTimezone("japan")).toBe("Asia/Tokyo");
    expect(resolveTimezone("thailand")).toBe("Asia/Bangkok");
    expect(resolveTimezone("uk")).toBe("Europe/London");
  });

  it("resolves timezone abbreviations", () => {
    expect(resolveTimezone("PT")).toBe("America/Los_Angeles");
    expect(resolveTimezone("ET")).toBe("America/New_York");
    expect(resolveTimezone("JST")).toBe("Asia/Tokyo");
    expect(resolveTimezone("UTC")).toBe("GMT");
  });

  it("resolves airport codes", () => {
    expect(resolveTimezone("SFO")).toBe("America/Los_Angeles");
    expect(resolveTimezone("JFK")).toBe("America/New_York");
    expect(resolveTimezone("LHR")).toBe("Europe/London");
    expect(resolveTimezone("NRT")).toBe("Asia/Tokyo");
  });

  it("is case-insensitive", () => {
    expect(resolveTimezone("sf")).toBe("America/Los_Angeles");
    expect(resolveTimezone("Bangkok")).toBe("Asia/Bangkok");
    expect(resolveTimezone("TOKYO")).toBe("Asia/Tokyo");
  });

  it("trims whitespace", () => {
    expect(resolveTimezone("  SF  ")).toBe("America/Los_Angeles");
  });

  it("falls back to IANA identifiers", () => {
    expect(resolveTimezone("America/Los_Angeles")).toBe("America/Los_Angeles");
    expect(resolveTimezone("Asia/Tokyo")).toBe("Asia/Tokyo");
  });

  it("returns undefined for unknown input", () => {
    expect(resolveTimezone("xyzzyplugh")).toBeUndefined();
    expect(resolveTimezone("")).toBeUndefined();
  });
});

describe("resolveZones", () => {
  it("parses comma-separated zone list", () => {
    const zones = resolveZones("Bangkok, SF, New York, London");
    expect(zones).toHaveLength(4);
    expect(zones[0]).toEqual({ label: "Bangkok", timezone: "Asia/Bangkok" });
    expect(zones[1]).toEqual({ label: "SF", timezone: "America/Los_Angeles" });
    expect(zones[2]).toEqual({ label: "New York", timezone: "America/New_York" });
    expect(zones[3]).toEqual({ label: "London", timezone: "Europe/London" });
  });

  it("skips unresolvable entries", () => {
    const zones = resolveZones("SF, xyzzy, NYC");
    expect(zones).toHaveLength(2);
  });

  it("handles empty string", () => {
    expect(resolveZones("")).toHaveLength(0);
  });
});
