import { describe, expect, it } from "vitest";
import {
  displayName,
  formatClock,
  formatDuration,
  formatPercent,
  formatRate,
  formatUsage,
  formatWatts,
} from "../src/render/format";

describe("formatClock", () => {
  it("shows the local time of day with seconds, which stays true while the view is not redrawn", () => {
    expect(formatClock(new Date(2026, 8, 23, 13, 5, 9).getTime())).toBe("13:05:09");
    expect(formatClock(new Date(2026, 8, 23, 0, 0, 0).getTime())).toBe("00:00:00");
  });
});

describe("displayName", () => {
  it("gives WebKit's XPC services readable names", () => {
    expect(displayName("com.apple.WebKit.WebContent")).toBe("Web Content (WebKit)");
    expect(displayName("com.apple.WebKit.GPU")).toBe("GPU (WebKit)");
    expect(displayName("com.apple.WebKit.Networking")).toBe("Networking (WebKit)");
  });
  it("leaves other names alone", () => {
    expect(displayName("WindowServer")).toBe("WindowServer");
  });
});

describe("formatUsage", () => {
  it("shows only CPU when energy impact tells nothing more (the usual case)", () => {
    expect(formatUsage({ energy: 18.2, cpu: 18.0 })).toBe("18% CPU");
    expect(formatUsage({ energy: 30, cpu: 22 })).toBe("22% CPU"); // under 1.5×
    expect(formatUsage({ energy: 12, cpu: 1 })).toBe("1% CPU · +GPU/wakeups"); // 12× and 11 points
    expect(formatUsage({ energy: 6, cpu: 1 })).toBe("1% CPU"); // 6× but only 5 points
  });

  it("flags extra battery cost beyond CPU when impact clearly exceeds it", () => {
    expect(formatUsage({ energy: 48, cpu: 31 })).toBe("31% CPU · +GPU/wakeups");
  });
});

describe("formatWatts", () => {
  it("formats with one decimal by default", () => {
    expect(formatWatts(12.44)).toBe("12.4 W");
    expect(formatWatts(12.44, 0)).toBe("12 W");
  });
  it("shows a dash when unknown", () => {
    expect(formatWatts(undefined)).toBe("– W");
  });
});

describe("formatDuration", () => {
  it.each([
    [30, "<1m"],
    [45 * 60, "45m"],
    [3 * 3600 + 10 * 60, "3h 10m"],
    [22 * 3600, "22h"],
    [79942, "22h 12m"],
    [26 * 3600, "1d 2h"],
  ])("%d s → %s", (sec, text) => {
    expect(formatDuration(sec)).toBe(text);
  });
});

describe("formatRate and formatPercent", () => {
  it("states the drain in plain words", () => {
    expect(formatRate(11.2)).toBe("11% per hour");
    expect(formatRate(-3)).toBe("gaining 3% per hour");
    expect(formatRate(undefined)).toBe("—");
  });
  it("formats percent", () => {
    expect(formatPercent(46)).toBe("46%");
    expect(formatPercent(undefined)).toBe("—");
  });
});
