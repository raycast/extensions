import { describe, expect, it } from "vitest";
import { cpuSeverity, wattSeverity } from "../src/analysis/severity";
import { THRESHOLDS } from "../src/analysis/thresholds";
import { chartSvg } from "../src/render/chart-svg";

describe("cpuSeverity", () => {
  it.each([
    [5, "low"],
    [24.9, "low"],
    [25, "moderate"],
    [50, "high"],
    [79, "high"],
    // Red is kept for runaways: a process at 99% for a minute is "High", matching its orange tag.
    [80, "high"],
    [180, "high"],
  ])("%d%% CPU → %s", (cpu, tone) => {
    expect(cpuSeverity(cpu, false)).toBe(tone);
  });

  it("is critical for a flagged runaway whatever its current reading", () => {
    expect(cpuSeverity(10, true)).toBe("critical");
  });

  it("does not turn red at the runaway CPU share alone, since a runaway also needs time", () => {
    expect(cpuSeverity(65, false)).toBe("high");
  });
});

describe("wattSeverity", () => {
  it.each([
    [8, "low"],
    [12.5, "moderate"],
    [24, "moderate"],
    [25, "high"],
    [60, "high"],
  ])("%d W → %s", (w, tone) => {
    expect(wattSeverity(w, false)).toBe(tone);
  });

  it("is critical when a runaway is present and unknown watts are low", () => {
    expect(wattSeverity(8, true)).toBe("critical");
    expect(wattSeverity(undefined, false)).toBe("low");
  });
});

describe("chart tone", () => {
  const pts = [
    { t: 0, w: 5 },
    { t: 60_000, w: 6 },
  ];
  it("colors the chart by severity in both appearances", () => {
    expect(chartSvg(pts, "dark", { tone: "critical" })).toContain("#FF453A");
    expect(chartSvg(pts, "light", { tone: "critical" })).toContain("#FF3B30");
    expect(chartSvg(pts, "dark", { tone: "low" })).toContain("#30D158");
    expect(chartSvg(pts, "light", { tone: "moderate" })).toContain("#FFCC00");
  });
  it("keeps orange as the default tone", () => {
    expect(chartSvg(pts, "dark")).toContain("#FF9F0A");
  });
});
