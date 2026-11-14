import { describe, expect, it } from "vitest";
import { FIGURE_ROW_HEIGHT, renderFigures } from "./figures";
import { chartTheme } from "./theme";

const rows = [
  { label: "Invested", value: "CZK 618,596.50" },
  { label: "Cash", value: "CZK 1,313.44" },
  { label: "Today", value: "−CZK 4,829.51 · −0.7%", tone: "down" as const },
];

describe("renderFigures", () => {
  it("draws one striped row per figure, stripes on every other row", () => {
    const svg = renderFigures(rows, { width: 428, appearance: "dark" });
    expect(svg).toContain(`viewBox="0 0 428 ${3 * FIGURE_ROW_HEIGHT}"`);
    expect((svg.match(/<rect /g) ?? []).length).toBe(2);
    expect((svg.match(/<text /g) ?? []).length).toBe(6);
  });
  it("puts labels left in muted text and values right-aligned, coloured by tone", () => {
    const svg = renderFigures(rows, { width: 428, appearance: "dark" });
    const t = chartTheme("dark");
    expect(svg).toMatch(new RegExp(`x="12"[^>]*fill="${t.mutedText}"[^>]*>Invested<`));
    expect(svg).toMatch(new RegExp(`x="416"[^>]*fill="${t.text}"[^>]*text-anchor="end"[^>]*>CZK 618,596.50<`));
    expect(svg).toMatch(new RegExp(`fill="${t.down}"[^>]*>−CZK 4,829.51`));
  });
  it("keeps every baseline inside its row and the image", () => {
    const svg = renderFigures(rows, { width: 428, appearance: "light" });
    const ys = [...svg.matchAll(/<text [^>]*y="([\d.]+)"/g)].map((m) => Number(m[1]));
    for (const y of ys) expect(y).toBeLessThanOrEqual(3 * FIGURE_ROW_HEIGHT - 4);
  });
  it("escapes text and shortens values too long for the row", () => {
    const svg = renderFigures([{ label: "Reference", value: "x".repeat(200) + "&" }], {
      width: 428,
      appearance: "dark",
    });
    expect(svg).not.toContain("x".repeat(200));
    expect(svg).toContain("…");
    expect(renderFigures([{ label: "A&B", value: "<1>" }], { width: 428, appearance: "dark" })).toContain("A&amp;B");
  });
});
