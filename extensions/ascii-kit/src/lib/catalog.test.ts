import { describe, expect, it } from "vitest";
import { GROUPS } from "../data/glyphs";
import { TEMPLATES } from "../data/templates";
import { BIG_ARROWS } from "./arrows";
import { renderBox, renderTitledBox } from "./box";
import { sideBySide, spaced, stack, withShadow } from "./layout";
import { displayWidth, riskyGlyphs } from "./width";

const widths = (s: string) => new Set(s.split("\n").map(displayWidth));

describe("glyph catalog", () => {
  const all = GROUPS.flatMap((g) => g.glyphs.map((x) => ({ group: g.title, ...x })));

  it("has unique names within each group", () => {
    const ids = all.map((x) => `${x.group}:${x.name}`);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has spinners whose frames share one width, so they don't jitter", () => {
    for (const x of all.filter((x) => x.frames)) expect(widths(x.frames!.join("\n")).size, x.name).toBe(1);
  });

  it("only uses emoji-capable glyphs where they're long established (↔ ↕)", () => {
    const risky = new Set(all.flatMap((x) => riskyGlyphs(x.text)));
    expect([...risky].sort()).toEqual(["↔", "↕"]);
  });
});

describe("layout", () => {
  it("titles a box in its top border and widens the box to fit", () => {
    expect(renderTitledBox("Files\n---\nsrc")).toBe(["┌─ Files ─┐", "│ src     │", "└─────────┘"].join("\n"));
    expect(renderBox("x", { title: "Long title" }).split("\n")[0]).toBe("┌─ Long title ─┐");
  });

  it("centres a multi-row joint between blocks", () => {
    const out = sideBySide([renderBox("a\nb\nc\nd"), renderBox("e")], spaced(BIG_ARROWS.solidRightSmall));
    const rows = out.split("\n");
    // Blocks are 6 and 3 rows; the 2-row joint sits on rows 2–3.
    expect(rows[2]).toBe("│ b │ ▄▄▄▄▄█▄ └───┘");
    expect(rows[3]).toContain("▀▀▀▀▀█▀");
  });

  it("stacks blocks centred, with the joint between them", () => {
    const out = stack([renderBox("one"), renderBox("three")], "▼");
    expect(out.split("\n")[3]).toBe("    ▼");
  });

  it("adds a shadow offset by one row and column", () => {
    const out = withShadow(renderBox("hi")).split("\n");
    expect(out).toEqual(["┌────┐", "│ hi │░", "└────┘░", " ░░░░░░"]);
  });
});

describe("big arrows", () => {
  it("keeps heavy arrows free of diagonals, so the safe family stays safe", () => {
    for (const k of ["heavyRight", "heavyLeft", "heavyDown", "heavyUp"] as const) {
      expect(BIG_ARROWS[k]).not.toMatch(/[╱╲]/);
    }
  });
  it("keeps solid heads symmetric: the rows above and below the shaft mirror each other", () => {
    for (const a of [BIG_ARROWS.solidRightLarge, BIG_ARROWS.solidRight, BIG_ARROWS.solidLeft]) {
      const r = a.split("\n");
      const flipped = r.map((l) => l.replace(/[▀▄]/g, (c) => (c === "▀" ? "▄" : "▀"))).reverse();
      expect(flipped).toEqual(r);
    }
  });
});

describe("templates", () => {
  // Hand-drawn templates whose first N rows must form a rectangle.
  const rectangular: Record<string, number> = {
    "Layout wireframe": 10,
    "Numbered callouts": 6,
    Modal: 7,
    Panels: 6,
    "Decision diamond": 3,
  };
  it.each(Object.entries(rectangular))("%s keeps its box rows the same width", (title, rows) => {
    const t = TEMPLATES.find((x) => x.title === title)!;
    const head = t.text.split("\n").slice(0, rows);
    const ws = new Set(head.map(displayWidth).filter((w) => w > 0));
    // A shadow adds one column to every row but the first.
    expect(ws.size, t.text).toBeLessThanOrEqual(title === "Modal" ? 2 : 1);
  });

  // Raycast's detail pane wraps code blocks at about 56 columns (measured from a screenshot).
  it("fits Raycast's preview width", () => {
    for (const t of TEMPLATES) {
      expect(Math.max(...t.text.split("\n").map(displayWidth)), t.title).toBeLessThanOrEqual(56);
    }
  });

  it("uses no emoji-capable glyphs", () => {
    for (const t of TEMPLATES) expect(riskyGlyphs(t.text), t.title).toEqual([]);
  });
});
