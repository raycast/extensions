import { formatMoneyCompact } from "../lib/format";
import { formatChartDate } from "./shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderMonthlyBars } from "./bars";
import { renderPriceChart } from "./price-line";
import { chartTheme } from "./theme";

const W = 460;
const price = {
  width: W,
  height: 190,
  appearance: "dark" as const,
  currency: "USD",
  range: "1Y" as const,
  avgPrice: 90,
};
const months = "JFMAMJJASOND".split("").map((l, i) => ({ label: l, value: (i + 1) * 10 }));
const bar = { width: W, height: 170, appearance: "dark" as const, currency: "EUR" };

function assertBounds(svg: string, width: number, height: number) {
  for (const m of svg.matchAll(/<text [^>]*?y="([\d.]+)"[^>]*?font-size="([\d.]+)"/g)) {
    expect(Number(m[1])).toBeGreaterThanOrEqual(Number(m[2]));
    expect(Number(m[1])).toBeLessThanOrEqual(height - 2);
  }
  for (const m of svg.matchAll(/<text [^>]*?x="([\d.]+)"[^>]*?text-anchor="(\w+)"/g)) {
    const x = Number(m[1]);
    if (m[2] === "start") expect(x).toBe(0);
    if (m[2] === "end") expect(x).toBe(width);
  }
  for (const m of svg.matchAll(/<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)" height="([\d.]+)"/g)) {
    expect(Number(m[1])).toBeGreaterThanOrEqual(0);
    expect(Number(m[2])).toBeGreaterThanOrEqual(0);
    expect(Number(m[1]) + Number(m[3])).toBeLessThanOrEqual(width + 0.01);
    expect(Number(m[2]) + Number(m[4])).toBeLessThanOrEqual(height - 18 + 0.01);
  }
}

/** Runs the tests in `zone` as the local time zone. */
function inTimeZone(zone: string) {
  let saved: string | undefined;
  beforeEach(() => {
    saved = process.env.TZ;
    process.env.TZ = zone;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.TZ;
    else process.env.TZ = saved;
  });
}

describe("renderPriceChart", () => {
  inTimeZone("UTC");
  const pts = [
    { t: Date.UTC(2025, 0, 1), close: 100 },
    { t: 1, close: 110 },
    { t: Date.UTC(2025, 11, 1), close: 120 },
  ];
  it("draws an edge-to-edge up line with labels", () => {
    const svg = renderPriceChart(pts, price);
    expect(svg).toContain(chartTheme("dark").up);
    expect(svg).toMatch(/<path d="M0,[\d.]+ L[\d.]+,[\d.]+ L460,/);
    expect(svg).toContain("avg $90.00");
    expect(svg).toContain("High $120.00");
    expect(svg).toContain("Low $100.00");
    expect(svg).toContain('stroke-dasharray="4 4"');
    expect(svg).toContain("Jan 2025");
    assertBounds(svg, W, 190);
  });
  it("uses down colour when falling and HH:mm for 1D", () => {
    const svg = renderPriceChart(
      [
        { t: Date.UTC(2025, 0, 1, 9, 30), close: 120 },
        { t: Date.UTC(2025, 0, 1, 16, 0), close: 100 },
      ],
      { ...price, range: "1D", avgPrice: null },
    );
    expect(svg).toContain(chartTheme("dark").down);
    expect(svg).toContain("09:30");
    expect(svg).toContain("16:00");
    expect(svg).not.toContain("avg");
  });
  it("shows a placeholder with too few points", () => {
    expect(renderPriceChart([], price)).toContain("Price chart unavailable");
  });
  it("keeps labels in bounds when avg is extreme", () => {
    assertBounds(renderPriceChart(pts, { ...price, avgPrice: 500 }), W, 190);
    assertBounds(renderPriceChart(pts, { ...price, avgPrice: 1 }), W, 190);
  });
});

describe("renderMonthlyBars", () => {
  it("draws 12 bars with the last in up colour", () => {
    const svg = renderMonthlyBars(months, bar);
    expect((svg.match(/<rect /g) ?? []).length).toBe(12);
    expect(svg).toContain("€120 peak");
    expect(svg.match(/<rect [^>]*fill="([^"]+)"/g)!.pop()).toContain(chartTheme("dark").up);
    assertBounds(svg, W, 170);
  });
  it("shows a placeholder when empty", () => {
    expect(renderMonthlyBars([], bar)).toContain("No dividends yet");
  });
  it("shows the given placeholder when every month is zero", () => {
    const zero = months.map((m) => ({ ...m, value: 0 }));
    const svg = renderMonthlyBars(zero, { ...bar, emptyMessage: "No dividends in the last 12 months" });
    expect(svg).toContain("No dividends in the last 12 months");
    expect(svg).not.toContain("No dividends yet");
  });
});

describe("formatMoneyCompact", () => {
  it("lowercases only the compact suffix", () => {
    expect(formatMoneyCompact(48213, "EUR")).toBe("€48.2k");
    expect(formatMoneyCompact(48213, "SEK")).toBe("SEK\u00a048.2k");
    expect(formatMoneyCompact(48213, "DKK")).toBe("DKK\u00a048.2k");
  });
  it("uses a real minus sign for negatives", () => {
    expect(formatMoneyCompact(-48213, "EUR")).toBe("−€48.2k");
  });
});

describe("formatChartDate", () => {
  inTimeZone("Asia/Tokyo");
  it("shows 1D times in the local time zone", () => {
    expect(formatChartDate(Date.UTC(2025, 0, 1, 9, 30), "1D")).toBe("18:30");
  });
  it("keeps dates for longer ranges in UTC", () => {
    expect(formatChartDate(Date.UTC(2025, 0, 31, 20, 0), "1M")).toBe("Jan 31");
  });
});
