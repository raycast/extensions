import { formatResetTime } from "./usage-limits-formatter";

jest.mock("@raycast/api", () => ({ Color: {} }), { virtual: true });

describe("formatResetTime", () => {
  const now = new Date(2026, 10, 6, 9, 0);
  const at = (...parts: [number, number, number, number]) => new Date(...parts).toISOString();
  const clock = (date: string) => new Date(date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  it("shows only the time for a reset today", () => {
    const reset = at(2026, 10, 6, 15);
    expect(formatResetTime(reset, now)).toBe(clock(reset));
  });

  it("adds the weekday within the week and the date beyond it", () => {
    expect(formatResetTime(at(2026, 10, 7, 15), now)).toContain(" ");
    expect(formatResetTime(at(2026, 10, 7, 15), now).startsWith(clock(at(2026, 10, 7, 15)))).toBe(false);
    expect(formatResetTime(at(2026, 10, 20, 15), now)).toContain(", ");
  });

  it("handles past and invalid dates", () => {
    expect(formatResetTime(at(2026, 10, 6, 8), now)).toBe("Resetting...");
    expect(formatResetTime("nope", now)).toBe("Unknown");
  });
});
