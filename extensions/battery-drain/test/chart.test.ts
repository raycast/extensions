import { describe, expect, it } from "vitest";
import { chartSvg } from "../src/render/chart-svg";

const points = Array.from({ length: 30 }, (_, i) => ({ t: i * 60_000, w: 5 + (i % 7) }));

describe("chartSvg", () => {
  it("draws an area and a line", () => {
    const svg = chartSvg(points, "dark");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('class="line"');
    expect(svg).toContain('class="area"');
  });

  it("marks the peak on the line itself instead of a heading above the chart", () => {
    const svg = chartSvg(points, "dark");
    expect(svg).not.toContain("Peak");
    // First peak of 5..11 is at i = 6; the marker sits on the line's point there.
    const peakPoint = /class="line" d="(?:[ML][\d.]+ [\d.]+ ){6}L([\d.]+) ([\d.]+)/.exec(svg);
    const marker = /<circle class="peak" cx="([\d.]+)" cy="([\d.]+)"/.exec(svg);
    expect(marker?.slice(1)).toEqual(peakPoint?.slice(1));
    expect(svg).toMatch(/class="peak-label"[^>]*>11 W</);
  });

  it("keeps the peak label inside the chart at either edge", () => {
    const atEnd = chartSvg(
      [
        { t: 0, w: 1 },
        { t: 60_000, w: 9 },
      ],
      "dark",
    );
    expect(atEnd).toMatch(/text-anchor="end"[^>]*class="peak-label"/);
    const atStart = chartSvg(
      [
        { t: 0, w: 9 },
        { t: 60_000, w: 1 },
      ],
      "dark",
    );
    expect(atStart).toMatch(/text-anchor="start"[^>]*class="peak-label"/);
  });

  it("uses different colors for light and dark", () => {
    const light = chartSvg(points, "light");
    const dark = chartSvg(points, "dark");
    expect(light).not.toEqual(dark);
    expect(light).toContain("#1C1C1E");
    expect(dark).toContain("#F2F2F7");
  });

  it("labels the grid lines in watts and the time axis", () => {
    const svg = chartSvg(points, "light");
    // peak 11 → yMax 12.65; grid at 25/50/75%
    expect(svg).toContain(">3 W<");
    expect(svg).toContain(">6 W<");
    expect(svg).toContain(">9 W<");
    expect(svg).toMatch(/>\d{2}:\d{2}</);
    expect(svg).toContain(">now<");
  });

  it("charts CPU in percent for a process", () => {
    const cpu = [
      { t: 0, w: 20 },
      { t: 60_000, w: 99 },
      { t: 120_000, w: 98 },
    ];
    const svg = chartSvg(cpu, "dark", { unit: "%" });
    expect(svg).toMatch(/class="peak-label"[^>]*>99%</);
    expect(svg).toContain(">28%<"); // yMax 113.85 × 25%
    expect(svg).not.toContain(" W<");
  });

  it("puts axis labels in a left margin, clear of the line", () => {
    const svg = chartSvg(points, "dark");
    const labelX = /<text x="([\d.]+)" y="[\d.]+" text-anchor="end" font-size="13"[^>]*>3 W</.exec(svg);
    const firstPoint = /class="line" d="M([\d.]+) /.exec(svg);
    expect(labelX && firstPoint && Number(labelX[1]) < Number(firstPoint[1])).toBe(true);
  });

  it("shows a placeholder with fewer than two points", () => {
    expect(chartSvg([], "light")).toContain("Collecting data");
    expect(chartSvg([{ t: 0, w: 5 }], "light")).toContain("Collecting data");
  });

  describe("gaps", () => {
    const minute = 60_000;
    const run = (from: number, count: number, w: number) =>
      Array.from({ length: count }, (_, i) => ({ t: (from + i) * minute, w }));

    const path = (svg: string, cls: string) => new RegExp(`class="${cls}" d="([^"]*)"`).exec(svg)?.[1] ?? "";

    it("bridges a gap longer than 10 minutes with a dashed line and no fill, since nothing was measured", () => {
      // The menu bar did not run from 15:40 to 16:25 (sleep, or the extension being replaced).
      const svg = chartSvg([...run(0, 5, 8), ...run(50, 5, 12)], "dark");
      expect(path(svg, "line").match(/M/g)).toHaveLength(2);
      expect(path(svg, "area").match(/Z/g)).toHaveLength(2);
      expect(path(svg, "gap").match(/M/g)).toHaveLength(1);
      expect(svg).toMatch(/class="gap"[^>]*stroke-dasharray/);
    });

    it("keeps one solid line across short gaps", () => {
      const svg = chartSvg([...run(0, 5, 8), ...run(14, 5, 12)], "dark");
      expect(path(svg, "line").match(/M/g)).toHaveLength(1);
      expect(svg).not.toContain('class="gap"');
    });

    it("joins a reading with no neighbours into the dashed bridges on both sides", () => {
      const svg = chartSvg([...run(0, 5, 8), { t: 40 * minute, w: 20 }, ...run(80, 5, 9)], "dark");
      expect(path(svg, "gap").match(/M/g)).toHaveLength(2);
      expect(path(svg, "line").match(/M/g)).toHaveLength(2);
    });
  });

  it("does not divide by zero for a flat series", () => {
    const svg = chartSvg(
      [
        { t: 0, w: 5 },
        { t: 1, w: 5 },
      ],
      "light",
    );
    expect(svg).not.toContain("NaN");
  });
});
