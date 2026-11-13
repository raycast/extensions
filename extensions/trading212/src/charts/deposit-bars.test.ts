import { describe, expect, it } from "vitest";
import { renderDepositBars } from "./deposit-bars";
import { chartTheme } from "./theme";

function months(values: number[]): { key: string; value: number }[] {
  // 24 months ending Nov 2026
  return values.map((value, i) => {
    const idx = 2026 * 12 + 10 - (values.length - 1 - i);
    return { key: `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`, value };
  });
}

const opts = { width: 428, height: 170, appearance: "dark" as const, currency: "CZK" };
const values = Array.from({ length: 24 }, (_, i) => (i === 7 ? -9000 : 10000 + i * 1000));

describe("renderDepositBars", () => {
  it("draws one bar per month: this month in the accent, earlier months muted, withdrawals red", () => {
    const svg = renderDepositBars(months(values), opts);
    const t = chartTheme("dark");
    const fills = [...svg.matchAll(/<rect [^>]*fill="([^"]+)"/g)].map((m) => m[1]);
    expect(fills).toHaveLength(24);
    expect(fills[23]).toBe(t.accent);
    expect(fills[0]).toBe(t.accentMuted);
    expect(fills[7]).toBe(t.down);
  });
  it("labels the average per month with a dashed line, and this month", () => {
    const svg = renderDepositBars(months(values), opts);
    const avg = values.reduce((a, b) => a + b, 0) / 24;
    expect(svg).toContain("stroke-dasharray");
    expect(svg).toContain(`avg CZK\u00a0${(avg / 1000).toFixed(1)}k / month`);
    expect(svg).toContain("CZK\u00a033k this month");
  });
  it("labels each January with its year", () => {
    const svg = renderDepositBars(months(values), opts);
    expect(svg).toContain(">2025<");
    expect(svg).toContain(">2026<");
  });
  it("leaves out the average line when the average isn't positive", () => {
    const svg = renderDepositBars(months(Array.from({ length: 24 }, (_, i) => (i === 23 ? -500 : 0))), opts);
    expect(svg).not.toContain("stroke-dasharray");
  });
  it("shows a message when nothing was deposited", () => {
    expect(renderDepositBars(months(Array(24).fill(0)), opts)).toContain("No deposits yet");
  });
  it("keeps every label inside the image", () => {
    const svg = renderDepositBars(months(values), opts);
    for (const m of svg.matchAll(/<text [^>]*y="([\d.]+)"[^>]*font-size="([\d.]+)"/g)) {
      expect(Number(m[1])).toBeGreaterThanOrEqual(Number(m[2]));
      expect(Number(m[1])).toBeLessThanOrEqual(170 - 2);
    }
  });
});
