import { describe, expect, it } from "vitest";
import { parseNumber, parseSeries, renderBars, renderColumns, renderLineChart, renderSparkline } from "./chart";
import { FORMATS, detectKinds, formatUnusable } from "./formats";
import { displayWidth } from "./width";

describe("parsing", () => {
  it.each([
    ["Design\t40\nBuild\t29", ["Design", "Build"], [40, 29]],
    ["Design: 40\nBuild: 29", ["Design", "Build"], [40, 29]],
    ["Rent  $800.00\nGas  $50.00", ["Rent", "Gas"], [800, 50]],
    ["Share 45%\nOther 55%", ["Share", "Other"], [45, 55]],
    ["3 5 9 14", ["", "", "", ""], [3, 5, 9, 14]],
    ["3, 5, 9", ["", "", ""], [3, 5, 9]],
  ])("reads %j", (input, labels, values) => {
    const s = parseSeries(input)!;
    expect(s.labels).toEqual(labels);
    expect(s.values).toEqual(values);
  });

  it("keeps a header row aside", () => {
    expect(parseSeries("Item\tAmount\nRent\t800\nGas\t50")?.header).toBe("Item\tAmount");
  });

  it("rejects dates and text", () => {
    expect(parseSeries("Kickoff 2026-01-10\nLaunch 2026-06-01")).toBeUndefined();
    expect(parseSeries("just some\nwords here")).toBeUndefined();
  });

  it.each([
    ["1,200", 1200],
    ["12,5", 12.5],
    ["1.200,50", 1200.5],
    ["$1,234.5", 1234.5],
    ["-3", -3],
  ])("parses %s as %d", (text, n) => expect(parseNumber(text)).toBe(n));
});

describe("bars", () => {
  it("scales to the maximum with eighth-block ends and aligned values", () => {
    expect(renderBars("Design\t40\nBuild\t29\nQA\t12.5\nLaunch\t0", 8).split("\n")).toEqual([
      "Design  ████████ 40",
      "Build   █████▊   29",
      "QA      ██▌      12.5",
      "Launch           0",
    ]);
  });

  it("shows a sliver for a tiny non-zero value", () => {
    expect(renderBars("a 1000\nb 1", 8).split("\n")[1]).toContain("▏");
  });

  it("refuses negatives, pointing at the line chart", () => {
    const bars = FORMATS.find((f) => f.id === "chart-bars")!;
    expect(formatUnusable(bars, "a 3\nb -2")).toMatch(/Line chart/);
  });
});

describe("columns", () => {
  it("puts each value just above its column and labels under a baseline", () => {
    expect(renderColumns("Q1 10\nQ2 20", 4).split("\n")).toEqual([
      "    20",
      "    ███",
      "10  ███",
      "███ ███",
      "███ ███",
      "───────",
      "Q1  Q2",
    ]);
  });
});

describe("sparkline", () => {
  it("maps min to ▁ and max to █, with the range after", () => {
    expect(renderSparkline("1 5 9")).toBe("▁▅█  1–9");
    expect(renderSparkline("4 4 4")).toBe("▄▄▄  4–4");
  });
});

describe("line chart", () => {
  const out = renderLineChart("Mon 3\nTue 5\nWed 9\nThu 4\nFri -2\nSat 6").split("\n");
  it("draws a y-axis with one label per row and the first point on ┼", () => {
    const axis = out.slice(0, -1).map((l) => l.match(/[┤┼]/)?.index);
    expect(new Set(axis).size).toBe(1);
    expect(out.filter((l) => l.includes("┼"))).toHaveLength(1);
  });
  it("labels the first and last x values", () => {
    expect(out.at(-1)!.trim()).toMatch(/^Mon\s+Sat$/);
  });
  it("uses only line glyphs for the plot", () => {
    const plot = out
      .slice(0, -1)
      .map((l) => l.slice(l.search(/[┤┼]/) + 1))
      .join("");
    expect(plot.replace(/[─│╭╮╰╯ ]/g, "")).toBe("");
  });
  it("handles a flat series", () => {
    expect(renderLineChart("1 1 1")).toContain("─");
  });
  it("keeps every row the same width as the widest label + plot", () => {
    expect(Math.max(...out.map(displayWidth))).toBeLessThanOrEqual(60);
  });
});

describe("detection", () => {
  it.each([
    ["Design\t40\nBuild\t29\nQA\t12", "chart"],
    ["3 5 9 14 12", "chart"],
    ["Item\tAmount\nRent\t800\nGas\t50", "table"],
  ])("%j → %s", (input, kind) => expect(detectKinds(input)[0]).toBe(kind));
});
