import { describe, expect, it } from "vitest";
import { FORMATS, detectKinds, formatUnusable } from "./formats";
import {
  looksLikeTimeline,
  parseGantt,
  renderGantt,
  renderKanban,
  renderTimelineHorizontal,
  renderTimelineVertical,
} from "./planning";
import { displayWidth } from "./width";

describe("gantt", () => {
  it("reads start-length and inclusive ranges", () => {
    expect(parseGantt("Design 1 2\nBuild 2-4\nQA 4.5 1.5")?.tasks).toEqual([
      { label: "Design", start: 1, length: 2 },
      { label: "Build", start: 2, length: 3 },
      { label: "QA", start: 4.5, length: 1.5 },
    ]);
  });

  it("draws bars under unit columns, with a custom unit", () => {
    expect(renderGantt("Sprint\nDiscovery 1 1\nBuild 2 3")).toBe(
      ["           S1  S2  S3  S4", "Discovery  ████", "Build          ████████████"].join("\n"),
    );
  });

  it("ends part-units with an eighth block", () => {
    expect(renderGantt("A 1 1.25", 4).split("\n")[1]).toBe("A  █████");
    expect(renderGantt("A 1 0.3", 4).split("\n")[1]).toBe("A  █▎");
  });

  it("rejects rows without numbers", () => {
    expect(parseGantt("Design 1 2\nBuild soon")).toBeUndefined();
  });

  it("won't draw a span too long to show, and says why", () => {
    expect(renderGantt("Design 1 5000000")).toBe("");
    const gantt = FORMATS.find((f) => f.id === "plan-gantt")!;
    expect(formatUnusable(gantt, "Design 1 5000000")).toMatch(/Spans 5000000 units/);
    expect(formatUnusable(gantt, "Design 1 52")).toBeUndefined();
  });
});

describe("timeline", () => {
  const input = "Jan: Kickoff\nMar: Public beta\nJun: Launch";
  it("puts each date and label under its dot", () => {
    const [track, dates, labels] = renderTimelineHorizontal(input).split("\n");
    const dots = [...track].flatMap((c, i) => (c === "●" ? [i] : []));
    expect(dots.map((i) => [...dates][i])).toEqual(["J", "M", "J"]);
    expect(dots.map((i) => [...labels][i])).toEqual(["K", "P", "L"]);
    expect(track.endsWith("►")).toBe(true);
  });

  it("keeps times of day whole", () => {
    expect(renderTimelineVertical("09:00 Standup\n10:30: Review")).toBe(
      ["09:00  ● Standup", "       │", "10:30  ● Review", "       ▼"].join("\n"),
    );
    expect(looksLikeTimeline("09:00 Standup\n10:30 Review")).toBe(true);
  });

  it("reads compact date:label rows", () => {
    expect(renderTimelineVertical("Jan:Kickoff\nFeb:Launch")).toBe(
      ["Jan  ● Kickoff", "     │", "Feb  ● Launch", "     ▼"].join("\n"),
    );
  });

  it("stacks vertically with dates in a column", () => {
    expect(renderTimelineVertical(input)).toBe(
      ["Jan  ● Kickoff", "     │", "Mar  ● Public beta", "     │", "Jun  ● Launch", "     ▼"].join("\n"),
    );
  });

  it.each([
    ["Jan: Kickoff\nMar: Beta", true],
    ["2026-01 Kickoff\n2026-03 Beta", true],
    ["Q1 2026: Plan\nQ2 2026: Build", true],
    ["W3 Draft\nW5 Review", true],
    ["Design 1 2\nBuild 2 3", false],
    ["Hello world\nFoo bar", false],
  ])("%j looks like a timeline: %s", (text, expected) => expect(looksLikeTimeline(text)).toBe(expected));
});

describe("kanban", () => {
  it("turns table columns into equal-height titled columns", () => {
    const out = renderKanban("Todo\tDoing\tDone\n○ Spec\t◐ Search\t✓ Login\n○ Copy\t\t✓ Nav");
    expect(new Set(out.split("\n").map(displayWidth)).size).toBe(1);
    expect(out.split("\n")[0]).toBe("┌─ Todo ─────┐ ┌─ Doing ────┐ ┌─ Done ─────┐");
    expect(out.split("\n")[2]).toBe("│ ○ Copy     │ │            │ │ ✓ Nav      │");
  });

  it("needs a header and cards", () => {
    const kanban = FORMATS.find((f) => f.id === "table-kanban")!;
    expect(formatUnusable(kanban, "Todo\tDone")).toBeTruthy();
  });
});

describe("detection", () => {
  it.each([
    ["Design 1 2\nBuild 2-4\nQA 5 1", "plan"],
    ["Jan: Kickoff\nMar: Beta\nJun: Launch", "plan"],
    ["Design\t40\nBuild\t29", "chart"],
    ["Todo\tDoing\n○ Spec\t◐ Search", "table"],
  ])("%j → %s", (input, kind) => expect(detectKinds(input)[0]).toBe(kind));
});
