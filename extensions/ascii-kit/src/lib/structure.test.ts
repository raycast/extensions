import { describe, expect, it } from "vitest";
import { renderFlowVerticalHeavy } from "./flow";
import { FORMATS, formatUnusable } from "./formats";
import { renderNested } from "./nested";
import { renderOrgChart } from "./orgchart";
import { displayWidth } from "./width";

const rect = (s: string) => expect(new Set(s.split("\n").map(displayWidth)).size, s).toBe(1);

describe("org chart", () => {
  it("centres a parent over two children and joins them", () => {
    expect(renderOrgChart("Lead\n  Design\n  Eng")).toBe(
      [
        "       ┌───────┐",
        "       │ Lead  │",
        "       └───┬───┘",
        "     ┌─────┴─────┐",
        "┌────┴────┐   ┌──┴──┐",
        "│ Design  │   │ Eng │",
        "└─────────┘   └─────┘",
      ].join("\n"),
    );
  });

  it("snaps the parent onto a middle child instead of drawing ┴┬ side by side", () => {
    const out = renderOrgChart("Lead\n  Design\n  Engineering\n  Ops").split("\n");
    expect(out[3]).toContain("┼");
    expect(out[3]).not.toMatch(/┴┬|┬┴/);
  });

  it("puts every child's joint on its box's centre column", () => {
    const out = renderOrgChart("Lead\n  Design\n  Engineering\n  Ops").split("\n");
    const connector = out[3];
    const tops = out[4];
    // Each ┌ ┬ ┐ on the connector row sits right above a ┴ in the children's top border.
    [...connector].forEach((ch, col) => {
      if ("┌┬┐┼├┤".includes(ch)) expect([...tops][col], `column ${col}`).toBe("┴");
    });
    // The parent's ┬ sits right above the connector's ┴.
    expect([...connector][[...out[2]].indexOf("┬")]).toMatch(/[┴┼├┤]/);
  });

  it("uses a straight line for a single child", () => {
    const out = renderOrgChart("Parent\n  Only child").split("\n");
    expect(out[3].trim()).toBe("│");
    expect([...out[3]].indexOf("│")).toBe([...out[2]].indexOf("┬"));
    expect([...out[4]].indexOf("┴")).toBe([...out[2]].indexOf("┬"));
  });

  it("widens a parent that is wider than its children without breaking joints", () => {
    const out = renderOrgChart("A very wide parent label\n  a\n  b").split("\n");
    const joint = [...out[2]].indexOf("┬");
    expect([...out[3]][joint]).toMatch(/[┴┼]/);
  });

  it("puts notes on a second line inside the box", () => {
    const rows = renderOrgChart("Lead\n  Design  2 people").split("\n");
    expect(rows.some((r) => r.includes("│ 2 people"))).toBe(true);
    expect(rows.findIndex((r) => r.includes("2 people"))).toBe(rows.findIndex((r) => r.includes("Design")) + 1);
  });
});

describe("nested boxes", () => {
  it("draws containers as titled boxes, styled by depth, sharing one width", () => {
    const out = renderNested("Page\n  Header\n    Logo\n  Content\n    Card\n  Footer");
    rect(out);
    expect(out).toBe(
      [
        "╔═ Page ════════╗",
        "║ ┌─ Header ──┐ ║",
        "║ │ Logo      │ ║",
        "║ └───────────┘ ║",
        "║ ┌─ Content ─┐ ║",
        "║ │ Card      │ ║",
        "║ └───────────┘ ║",
        "║ Footer        ║",
        "╚═══════════════╝",
      ].join("\n"),
    );
  });

  it("uses rounded boxes at the third level", () => {
    expect(renderNested("a\n  b\n    c\n      d")).toContain("╭─ c");
  });
});

describe("heavy vertical flow", () => {
  it("centres the ┃ ┃ ▼ arrow on equal, odd-width boxes", () => {
    const out = renderFlowVerticalHeavy("Draft > Review").split("\n");
    const box = out[0];
    expect(displayWidth(box) % 2).toBe(1);
    const centre = (displayWidth(box) - 1) / 2;
    expect(out[3]).toBe(" ".repeat(centre) + "┃");
    expect(out[5]).toBe(" ".repeat(centre) + "▼");
    expect(displayWidth(out[6])).toBe(displayWidth(box));
  });
});

describe("titled box", () => {
  const titled = FORMATS.find((f) => f.id === "box-titled")!;
  it("needs a body under the title", () => {
    expect(formatUnusable(titled, "Only a title")).toBeTruthy();
    expect(formatUnusable(titled, "Title\nbody")).toBeUndefined();
  });
});
