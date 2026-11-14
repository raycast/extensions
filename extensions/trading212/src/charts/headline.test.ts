import { describe, expect, it } from "vitest";
import { headlineLayout, withHeadline } from "./headline";
import { svgDocument } from "./svg";

const head = {
  label: "Total balance",
  amount: "CZK 690,026.64",
  change: [{ text: "+CZK 70,116.70 · +11.3%", tone: "up" as const }, { text: " all-time" }],
};

describe("headlineLayout", () => {
  it("spaces label→amount 12, amount→change 4, change→chart 20", () => {
    const l = headlineLayout(head);
    expect(l.amountTop - (l.labelTop + l.labelHeight)).toBeCloseTo(12);
    expect(l.changeTop! - (l.amountTop + l.amountHeight)).toBeCloseTo(4);
    expect(l.chartTop - (l.changeTop! + l.changeHeight)).toBeCloseTo(20);
  });
  it("puts the chart 20 below the amount when there's no change line", () => {
    const l = headlineLayout({ label: "x", amount: "y" });
    expect(l.changeTop).toBeNull();
    expect(l.chartTop - (l.amountTop + l.amountHeight)).toBeCloseTo(20);
  });
});

describe("withHeadline", () => {
  const chart = svgDocument('<rect id="c" width="10" height="10"/>', 428, 220);
  it("draws the headline and the chart below it in one image", () => {
    const { svg, height } = withHeadline(head, chart, 220, { width: 428, appearance: "dark" });
    const { chartTop } = headlineLayout(head);
    expect(height).toBeCloseTo(chartTop + 220);
    expect(svg.match(/<svg /g)).toHaveLength(1);
    expect(svg).toContain(`<g transform="translate(0,${chartTop})"><rect id="c"`);
    expect(svg).toContain(">Total balance<");
    expect(svg).toContain(">CZK 690,026.64<");
    expect(svg).toContain("+CZK 70,116.70 · +11.3%");
  });
  it("escapes headline text", () => {
    expect(
      withHeadline({ label: "A&B", amount: "<1>" }, chart, 220, { width: 428, appearance: "light" }).svg,
    ).toContain("A&amp;B");
  });
});

describe("withHeadline figures", () => {
  const chart = svgDocument('<rect id="c" width="10" height="10"/>', 428, 220);
  it("draws the figure rows 20 below the chart in the same image", () => {
    const figures = [
      { label: "Invested", value: "CZK 1" },
      { label: "Cash", value: "CZK 2" },
    ];
    const { svg, height } = withHeadline(head, chart, 220, { width: 428, appearance: "dark", figures });
    const { chartTop } = headlineLayout(head);
    expect(svg).toContain(`<g transform="translate(0,${chartTop + 220 + 20})">`);
    expect(height).toBeCloseTo(chartTop + 220 + 20 + 2 * 28);
    expect(svg).toContain(">Invested<");
    expect(svg.match(/<svg /g)).toHaveLength(1);
  });
  it("adds nothing below the chart without figures", () => {
    const { height } = withHeadline(head, chart, 220, { width: 428, appearance: "dark", figures: [] });
    expect(height).toBeCloseTo(headlineLayout(head).chartTop + 220);
  });
});

describe("top edge", () => {
  it("starts the label's letters at the top of the image (no extra space above)", () => {
    const { svg } = withHeadline(head, svgDocument("", 428, 10), 10, { width: 428, appearance: "dark" });
    const firstBaseline = Number(/<text [^>]*y="([\d.]+)"/.exec(svg)?.[1]);
    // 13pt label: ascenders reach ~0.76em above the baseline, so the baseline sits ~9.9 from the top.
    expect(firstBaseline).toBeCloseTo(13 * 0.76, 1);
  });
});

describe("headline without a chart", () => {
  it("puts the figure rows 20 below the last headline line", () => {
    const h = {
      label: "Market buy · Oct 22, 2026",
      amount: "Bought 4 VFEM",
      change: [{ text: "at €69.82 per share" }],
    };
    const figures = [{ label: "Total", value: "7 000 CZK" }];
    const { svg, height } = withHeadline(h, null, 0, { width: 428, appearance: "dark", figures });
    const l = headlineLayout(h);
    const lastBottom = l.changeTop! + l.changeHeight;
    expect(svg).toContain(`<g transform="translate(0,${lastBottom + 20})">`);
    expect(height).toBeCloseTo(lastBottom + 20 + 28);
    expect(svg).toContain(">Bought 4 VFEM<");
  });
});
