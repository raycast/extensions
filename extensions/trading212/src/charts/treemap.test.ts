import { describe, expect, it } from "vitest";
import { chartTheme, returnColor } from "./theme";
import { renderTreemap, squarify } from "./treemap";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const item = (label: string, value: number, returnPct = 0) => ({ label, value, returnPct });

describe("squarify", () => {
  const tiles = squarify(
    [item("A", 6), item("B", 6), item("C", 4), item("D", 3), item("E", 2), item("F", 2), item("G", 1)],
    600,
    400,
  );

  it("fills the area, stays in bounds and never overlaps", () => {
    expect(tiles).toHaveLength(7);
    expect(sum(tiles.map((t) => t.w * t.h))).toBeCloseTo(240000, 0);
    for (const t of tiles) {
      expect(t.x).toBeGreaterThanOrEqual(-1e-6);
      expect(t.y).toBeGreaterThanOrEqual(-1e-6);
      expect(t.x + t.w).toBeLessThanOrEqual(600 + 1e-6);
      expect(t.y + t.h).toBeLessThanOrEqual(400 + 1e-6);
    }
    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        const a = tiles[i];
        const b = tiles[j];
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        expect(Math.max(0, ox) * Math.max(0, oy)).toBeLessThan(1e-6);
      }
    }
  });

  it("sizes tiles proportionally to value", () => {
    expect(tiles[0].w * tiles[0].h).toBeCloseTo((240000 * 6) / 24, 3);
  });

  it("drops non-positive values", () => {
    expect(squarify([item("Z", 0)], 600, 400)).toEqual([]);
    expect(squarify([item("Z", -3)], 600, 400)).toEqual([]);
  });
});

describe("renderTreemap", () => {
  it("shows an empty state", () => {
    expect(renderTreemap([], { width: 460, height: 220, appearance: "dark" })).toContain("No positions yet");
  });

  it("escapes labels", () => {
    const svg = renderTreemap([item("A&B", 1, 5)], { width: 460, height: 220, appearance: "dark" });
    expect(svg).toContain("A&amp;B");
    expect(svg).not.toContain("A&B");
  });

  it("leaves tiny tiles unlabelled", () => {
    const items = Array.from({ length: 120 }, (_, i) => item(`T${i + 1}`, i + 1, 1));
    const opts = { width: 460, height: 220, appearance: "dark" as const };
    const tiles = squarify(items, opts.width, opts.height);
    expect(tiles).toHaveLength(120);
    const svg = renderTreemap(items, opts);
    const labelled = (svg.match(/<text/g) ?? []).length / 2;
    expect(labelled).toBeGreaterThan(0);
    expect(labelled).toBeLessThan(120);
  });
});

describe("renderTreemap bounds", () => {
  it("keeps every element inside the viewBox", () => {
    const height = 220;
    const svg = renderTreemap([item("A", 3, 5), item("B", 1, -8)], {
      width: 460,
      height,
      appearance: "dark",
    });
    const texts = [...svg.matchAll(/<text [^>]*?\sy="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(texts.length).toBeGreaterThan(0);
    for (const y of texts) expect(y).toBeLessThanOrEqual(height - 2);
    const rects = [...svg.matchAll(/<rect [^>]*?\sy="([\d.]+)" width="[\d.]+" height="([\d.]+)"/g)];
    expect(rects.length).toBeGreaterThan(0);
    for (const m of rects) expect(Number(m[1]) + Number(m[2])).toBeLessThanOrEqual(height + 1e-6);
  });
});

describe("renderTreemap label fit", () => {
  function assertLabelsFit(svg: string) {
    const rects = [...svg.matchAll(/<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)"/g)].map((m) => ({
      x: Number(m[1]),
      w: Number(m[2]),
    }));
    const texts = [...svg.matchAll(/<text x="([\d.]+)"[^>]*font-size="([\d.]+)"[^>]*>([^<]*)<\/text>/g)].map((m) => ({
      cx: Number(m[1]),
      fs: Number(m[2]),
      chars: m[3].length,
    }));
    let checked = 0;
    for (const t of texts) {
      const tile = rects.find((r) => Math.abs(r.x + r.w / 2 - t.cx) < 1e-6);
      if (!tile) continue;
      checked++;
      expect(t.chars * t.fs * 0.62).toBeLessThanOrEqual(tile.w - 6 + 1e-6);
    }
    expect(checked).toBeGreaterThan(0);
  }

  it("fits both lines inside every labelled tile (120 items)", () => {
    const items = Array.from({ length: 120 }, (_, i) => item(`T${i + 1}`, i + 1, 91.9));
    assertLabelsFit(renderTreemap(items, { width: 460, height: 220, appearance: "dark" }));
  });

  it("fits both lines for a realistic 16-position portfolio", () => {
    const data: [string, number, number][] = [
      ["VUAA", 9800, 20.2],
      ["Small Caps", 6900, 23.7],
      ["Top Stocks", 5400, 25],
      ["VWCE", 4200, 2.9],
      ["Sporobond", 3500, 5.4],
      ["VHYL", 3900, 5.6],
      ["FUSD", 3300, 6.1],
      ["REICO", 2500, 16.4],
      ["SPYW", 2100, 7.6],
      ["JGPI", 1700, 6.3],
      ["VFEM", 1900, -3.5],
      ["AAPL", 1500, 91.9],
      ["NVDA", 600, 1.2],
      ["XPEV", 450, -24],
      ["TSLA", 300, -12],
      ["AMD", 120, 8],
    ];
    const items = data.map(([label, value, returnPct]) => item(label, value, returnPct));
    assertLabelsFit(renderTreemap(items, { width: 460, height: 220, appearance: "dark" }));
  });
});

describe("returnColor", () => {
  it("clamps at ±30", () => {
    const t = chartTheme("dark");
    expect(returnColor(45, t)).toBe(returnColor(30, t));
    expect(returnColor(-45, t)).toBe(returnColor(-30, t));
  });

  it("is the neutral tile at zero", () => {
    expect(returnColor(0, chartTheme("dark"))).toBe("rgb(44,44,46)");
  });

  it("reaches the up/down tile colours at the extremes", () => {
    const t = chartTheme("dark");
    // Raycast's green #59D499 and red #FF6363, tinted onto the dark background.
    expect(returnColor(30, t)).toBe("rgb(57,112,87)");
    expect(returnColor(-30, t)).toBe("rgb(131,61,62)");
  });
});
