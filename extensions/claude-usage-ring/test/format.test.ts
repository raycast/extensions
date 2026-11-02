import { describe, expect, it } from "vitest";
import { formatAgo, formatPercent, formatPlan, formatReset } from "../src/lib/format";

const now = new Date(2026, 10, 2, 14, 16, 0).getTime();

describe("formatReset", () => {
  it("relative under 24h", () => {
    expect(formatReset(new Date(now + (2 * 60 + 14) * 60_000), now)).toBe("in 2h 14m");
    expect(formatReset(new Date(now + 14 * 60_000), now)).toBe("in 14m");
    expect(formatReset(new Date(now + 3 * 3600_000), now)).toBe("in 3h");
    expect(formatReset(new Date(now + 20_000), now)).toBe("in 1m");
  });
  it("weekday + time at or over 24h", () => {
    expect(formatReset(new Date(2026, 10, 7, 19, 0), now)).toBe("Sat 19:00");
    expect(formatReset(new Date(2026, 10, 3, 14, 16), now)).toBe("Tue 14:16");
  });
  it("adds the date from 6 days out, so a same-weekday reset is unambiguous", () => {
    expect(formatReset(new Date(2026, 10, 9, 12, 0), now)).toBe("Mon 9 Nov 12:00");
  });
  it("past", () => {
    expect(formatReset(new Date(now - 1000), now)).toBe("resetting now");
  });
});

describe("formatAgo", () => {
  it.each([
    [10_000, "just now"],
    [60_000, "1 min ago"],
    [23 * 60_000, "23 min ago"],
    [3 * 3600_000, "3 h ago"],
    [72 * 3600_000, "3 d ago"],
  ])("%i ms → %s", (d, s) => expect(formatAgo(now - d, now)).toBe(s));
});

describe("formatPercent / formatPlan", () => {
  it("rounds", () => {
    expect(formatPercent(7.6)).toBe("8%");
    expect(formatPercent(0)).toBe("0%");
  });
  it("plan labels", () => {
    expect(formatPlan("team", "default_claude_max_5x")).toBe("Team · Max 5x");
    expect(formatPlan("max", "default_claude_max_20x")).toBe("Max 20x");
    expect(formatPlan("pro", "default_claude_ai")).toBe("Pro");
    expect(formatPlan(undefined, undefined)).toBeNull();
  });
});
