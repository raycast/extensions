import { todayStrings, currentTimestamp } from "../date-utils";

describe("todayStrings", () => {
  it("returns correct year", () => {
    const d = new Date("2026-05-23T10:18:00");
    expect(todayStrings(d).year).toBe("2026");
  });

  it("returns zero-padded month number and full month name", () => {
    const d = new Date("2026-05-23T10:18:00");
    expect(todayStrings(d).month).toBe("05-May");
  });

  it("returns full day string with weekday name", () => {
    const d = new Date("2026-05-23T10:18:00");
    expect(todayStrings(d).day).toBe("2026-05-23 Saturday");
  });

  it("pads single-digit day and month", () => {
    const d = new Date("2026-01-03T10:00:00");
    const { month, day } = todayStrings(d);
    expect(month).toBe("01-January");
    expect(day).toBe("2026-01-03 Saturday");
  });
});

describe("currentTimestamp", () => {
  it("formats morning time as 12-hour AM", () => {
    const d = new Date("2026-05-23T08:18:00");
    expect(currentTimestamp(d)).toBe("8:18 AM");
  });

  it("formats afternoon time as 12-hour PM", () => {
    const d = new Date("2026-05-23T14:05:00");
    expect(currentTimestamp(d)).toBe("2:05 PM");
  });

  it("formats noon as 12:00 PM", () => {
    const d = new Date("2026-05-23T12:00:00");
    expect(currentTimestamp(d)).toBe("12:00 PM");
  });

  it("formats midnight as 12:00 AM", () => {
    const d = new Date("2026-05-23T00:00:00");
    expect(currentTimestamp(d)).toBe("12:00 AM");
  });

  it("zero-pads minutes", () => {
    const d = new Date("2026-05-23T09:05:00");
    expect(currentTimestamp(d)).toBe("9:05 AM");
  });
});
