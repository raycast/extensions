import { describe, expect, it } from "vitest";
import { fromPlaneDate, toPlaneDate } from "../src/helpers/dates";

describe("toPlaneDate", () => {
  it("keeps the picked calendar day when the SDK serializes it", () => {
    const picked = new Date(2026, 9, 20); // local midnight, 20 Oct
    expect(toPlaneDate(picked)?.toISOString().substring(0, 10)).toBe("2026-10-20");
  });

  it("returns undefined for empty or invalid dates", () => {
    expect(toPlaneDate(undefined)).toBeUndefined();
    expect(toPlaneDate(null)).toBeUndefined();
    expect(toPlaneDate(new Date("nope"))).toBeUndefined();
  });
});

describe("fromPlaneDate", () => {
  it("returns local midnight of the stored calendar day", () => {
    const date = fromPlaneDate("2026-10-20");
    expect([date?.getFullYear(), date?.getMonth(), date?.getDate(), date?.getHours()]).toEqual([2026, 9, 20, 0]);
  });

  it("accepts the SDK's UTC-midnight Date", () => {
    const date = fromPlaneDate(new Date("2026-10-20T00:00:00Z"));
    expect(date?.getDate()).toBe(20);
  });

  it("round-trips through toPlaneDate", () => {
    const picked = new Date(2026, 0, 1);
    expect(fromPlaneDate(toPlaneDate(picked))?.getTime()).toBe(picked.getTime());
  });

  it("returns undefined for empty or invalid values", () => {
    expect(fromPlaneDate(undefined)).toBeUndefined();
    expect(fromPlaneDate("")).toBeUndefined();
    expect(fromPlaneDate("nope")).toBeUndefined();
  });
});
