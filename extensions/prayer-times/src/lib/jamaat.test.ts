import { describe, expect, it } from "vitest";
import { applyJamaatRule, parseJamaatRule } from "./jamaat";

const at = (h: number, m: number, s = 0) => new Date(2026, 9, 8, h, m, s);

describe("parseJamaatRule", () => {
  it("parses each rule form", () => {
    expect(parseJamaatRule("")).toEqual({ kind: "none" });
    expect(parseJamaatRule(" 13:30 ")).toEqual({ kind: "fixed", hours: 13, minutes: 30 });
    expect(parseJamaatRule("+10")).toEqual({ kind: "offset", minutes: 10 });
    expect(parseJamaatRule("floor5+15")).toEqual({ kind: "round", direction: "floor", step: 5, minutes: 15 });
    expect(parseJamaatRule("CEIL10 + 5")).toEqual({ kind: "round", direction: "ceil", step: 10, minutes: 5 });
    expect(parseJamaatRule("floor+15")).toEqual({ kind: "round", direction: "floor", step: 5, minutes: 15 });
    expect(parseJamaatRule("end-30")).toEqual({ kind: "beforeEnd", minutes: 30 });
  });

  it("flags nonsense as invalid", () => {
    expect(parseJamaatRule("25:00").kind).toBe("invalid");
    expect(parseJamaatRule("soon").kind).toBe("invalid");
    expect(parseJamaatRule("floor0+5").kind).toBe("invalid");
  });
});

describe("applyJamaatRule", () => {
  it("rounds 5:01 down to 5:00 and adds 15", () => {
    expect(applyJamaatRule(parseJamaatRule("floor5+15"), at(5, 1))).toEqual(at(5, 15));
  });

  it("ignores seconds when rounding", () => {
    expect(applyJamaatRule(parseJamaatRule("floor5+15"), at(5, 4, 59))).toEqual(at(5, 15));
  });

  it("keeps an exact multiple of the step", () => {
    expect(applyJamaatRule(parseJamaatRule("floor5+15"), at(16, 35))).toEqual(at(16, 50));
    expect(applyJamaatRule(parseJamaatRule("ceil5+10"), at(16, 35))).toEqual(at(16, 45));
  });

  it("rounds up with ceil", () => {
    expect(applyJamaatRule(parseJamaatRule("ceil5+10"), at(18, 12))).toEqual(at(18, 25));
  });

  it("adds a plain offset", () => {
    expect(applyJamaatRule(parseJamaatRule("+5"), at(18, 12))).toEqual(at(18, 17));
  });

  it("uses a fixed time on the prayer's day, and drops it when before the start", () => {
    expect(applyJamaatRule(parseJamaatRule("13:30"), at(12, 21))).toEqual(at(13, 30));
    expect(applyJamaatRule(parseJamaatRule("12:00"), at(12, 21))).toBeUndefined();
  });

  it("sets jamaat a fixed time before the prayer ends", () => {
    expect(applyJamaatRule(parseJamaatRule("end-30"), at(12, 21), at(16, 33, 40))).toEqual(at(16, 3));
    expect(applyJamaatRule(parseJamaatRule("end-30"), at(12, 21))).toBeUndefined();
    expect(applyJamaatRule(parseJamaatRule("end-90"), at(5, 11), at(6, 27))).toBeUndefined();
  });

  it("returns nothing for none and invalid", () => {
    expect(applyJamaatRule(parseJamaatRule(""), at(5, 1))).toBeUndefined();
    expect(applyJamaatRule(parseJamaatRule("soon"), at(5, 1))).toBeUndefined();
  });
});

describe("jamaat edge cases", () => {
  // [rule, prayer start, prayer end, expected jamaat ("HH:MM", "+1d HH:MM" for the next day, or undefined)]
  const cases: [string, Date, Date | undefined, string | undefined][] = [
    // Rounding across hour and day boundaries
    ["floor5+15", at(12, 58), undefined, "13:10"],
    ["ceil5+0", at(12, 58), undefined, "13:00"],
    ["ceil5+10", new Date(2026, 9, 8, 23, 58), undefined, "+1d 00:10"],
    // Other steps
    ["floor10+5", at(16, 32), undefined, "16:35"],
    ["floor10+5", at(16, 37), undefined, undefined], // 16:35 is before the start
    ["ceil15+0", at(16, 31), undefined, "16:45"],
    ["floor15+0", at(16, 44), undefined, undefined], // 16:30 is before the start
    ["floor5+0", at(5, 1), undefined, undefined], // 5:00 is before the start
    ["floor5+0", at(5, 0), undefined, "05:00"],
    // Offsets
    ["+0", at(18, 12), undefined, "18:12"],
    ["+120", at(18, 12), undefined, "20:12"],
    // Fixed times
    ["9:05", at(5, 1), undefined, "09:05"],
    ["00:00", at(5, 1), undefined, undefined],
    // Before the end
    ["end-0", at(12, 21), at(16, 3), "16:03"],
    ["end-30", at(16, 33), at(17, 0), undefined], // would be before the start
    ["end-30", at(12, 21), at(16, 33, 59), "16:03"], // seconds of the end are dropped
  ];

  it.each(cases)("%s from %s", (rule, start, end, expected) => {
    const jamaat = applyJamaatRule(parseJamaatRule(rule), start, end);
    if (expected === undefined) return expect(jamaat).toBeUndefined();
    const [nextDay, time] = expected.startsWith("+1d ") ? [true, expected.slice(4)] : [false, expected];
    const [h, m] = time.split(":").map(Number);
    expect(jamaat).toEqual(new Date(start.getFullYear(), start.getMonth(), start.getDate() + (nextDay ? 1 : 0), h, m));
  });

  it.each([
    "floor5-15",
    "+",
    "+-5",
    "end+30",
    "end-",
    "5",
    "13:3",
    "13:60",
    "24:00",
    "floor5+",
    "floor100+5",
    "+1000",
    "4:45pm",
  ])("rejects %s", (rule) => {
    expect(parseJamaatRule(rule).kind).toBe("invalid");
  });

  it("ignores case and spaces", () => {
    expect(parseJamaatRule(" FLOOR5 + 15 ")).toEqual({ kind: "round", direction: "floor", step: 5, minutes: 15 });
    expect(parseJamaatRule(" End - 30 ")).toEqual({ kind: "beforeEnd", minutes: 30 });
    expect(parseJamaatRule(undefined)).toEqual({ kind: "none" });
  });
});
