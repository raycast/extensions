import { describe, expect, it } from "vitest";
import { addDays, fixedOffsetZone, formatOffset, wallParts, wallToInstant, zoneAbbreviation, zoneOffset } from "../src/core/time";

describe("time", () => {
  it("round-trips wall clock in Berlin across DST", () => {
    const summer = wallToInstant("Europe/Berlin", 2026, 7, 1, 12, 0);
    expect(wallParts(summer, "Europe/Berlin")).toMatchObject({ y: 2026, m: 7, d: 1, h: 12, min: 0 });
    expect(zoneOffset(summer, "Europe/Berlin")).toBe(120);
    const winter = wallToInstant("Europe/Berlin", 2026, 1, 15, 12, 0);
    expect(zoneOffset(winter, "Europe/Berlin")).toBe(60);
  });

  it("handles the spring-forward gap by moving later", () => {
    // 2026-03-29 02:30 does not exist in Berlin
    const t = wallToInstant("Europe/Berlin", 2026, 3, 29, 2, 30);
    expect(wallParts(t, "Europe/Berlin").h).toBe(3);
  });

  it("resolves a fall-back overlap to the first (DST) reading in every zone", () => {
    expect(wallToInstant("Europe/Berlin", 2026, 10, 25, 2, 30)).toBe(Date.UTC(2026, 9, 25, 0, 30));
    expect(wallToInstant("America/New_York", 2026, 11, 1, 1, 30)).toBe(Date.UTC(2026, 10, 1, 5, 30));
    expect(wallToInstant("Australia/Sydney", 2026, 4, 5, 2, 30)).toBe(Date.UTC(2026, 3, 4, 15, 30));
  });

  it("knows the US/EU DST skew week", () => {
    // 2026-10-29: EU already on standard time (Oct 25), US still on DST (until Nov 1)
    const t = wallToInstant("America/New_York", 2026, 10, 29, 17, 0);
    expect(wallParts(t, "Europe/Berlin").h).toBe(22);
    const t2 = wallToInstant("America/New_York", 2026, 10, 15, 17, 0);
    expect(wallParts(t2, "Europe/Berlin").h).toBe(23);
  });

  it("abbreviations", () => {
    const summer = wallToInstant("Europe/Berlin", 2026, 7, 1, 12);
    expect(zoneAbbreviation(summer, "Europe/Berlin", ["CET", "CEST"])).toBe("CEST");
    expect(zoneAbbreviation(summer, "America/Los_Angeles")).toBe("PDT");
    expect(zoneAbbreviation(summer, "UTC", ["UTC"])).toBe("UTC");
    expect(zoneAbbreviation(summer, "Asia/Kolkata", ["IST"])).toBe("IST");
  });

  it("offset formatting and fixed zones", () => {
    expect(formatOffset(120)).toBe("+2h");
    expect(formatOffset(-330)).toBe("−5:30");
    expect(formatOffset(0)).toBe("±0");
    expect(formatOffset(120, "UTC")).toBe("UTC+2");
    expect(fixedOffsetZone(120)).toBe("Etc/GMT-2");
    expect(zoneOffset(Date.UTC(2026, 0, 1), "Etc/GMT-2")).toBe(120);
    expect(fixedOffsetZone(330)).toBeUndefined();
  });

  it("addDays is DST-safe", () => {
    const t = wallToInstant("Europe/Berlin", 2026, 3, 28, 9, 0);
    expect(wallParts(addDays(t, "Europe/Berlin", 1), "Europe/Berlin")).toMatchObject({ d: 29, h: 9 });
  });
});
