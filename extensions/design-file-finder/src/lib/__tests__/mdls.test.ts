import { describe, expect, it } from "vitest";
import { parseLastUsedRaw } from "../mdls";

describe("parseLastUsedRaw", () => {
  it("parses the mdls raw date format with timezone", () => {
    const ms = parseLastUsedRaw("2026-06-20 14:32:11 +0000");
    expect(ms).toBe(Date.UTC(2026, 5, 20, 14, 32, 11));
  });
  it("applies the timezone offset", () => {
    const utc = parseLastUsedRaw("2026-06-20 14:32:11 +0000")!;
    const plusTwo = parseLastUsedRaw("2026-06-20 16:32:11 +0200")!;
    expect(plusTwo).toBe(utc);
  });
  it("returns null for (null) and blanks", () => {
    expect(parseLastUsedRaw("(null)")).toBeNull();
    expect(parseLastUsedRaw("")).toBeNull();
    expect(parseLastUsedRaw("   ")).toBeNull();
  });
  it("returns null for unparseable junk", () => {
    expect(parseLastUsedRaw("not a date")).toBeNull();
  });
});
