import { describe, expect, it } from "vitest";
import { renderBox } from "./box";
import { Canvas } from "./canvas";
import { parseFlow, renderFlowHorizontal, renderFlowInline, renderFlowVertical } from "./flow";
import { Format, MAX_INPUT_LINES, detectKinds, drawFormat, inputTooLarge, unusable } from "./formats";
import { fence } from "./markdown";
import { renderSequence } from "./sequence";
import { parseTable, renderTable } from "./table";
import { renderTree } from "./tree";
import { displayWidth, expandTabs, riskyGlyphs, truncate } from "./width";

const widths = (s: string) => new Set(s.split("\n").map(displayWidth));
const rect = (s: string) => expect(widths(s).size, `ragged:\n${s}`).toBe(1);

describe("width", () => {
  it("counts box drawing as 1 and emoji / CJK as 2", () => {
    expect(displayWidth("├──")).toBe(3);
    expect(displayWidth("✅")).toBe(2);
    expect(displayWidth("日本")).toBe(4);
    expect(displayWidth("é")).toBe(1);
    expect(displayWidth("👩‍💻")).toBe(2);
  });
  it("flags text-default emoji only", () => {
    expect(riskyGlyphs("⚠ ok ✓ ├── ▶ ☑ ✅")).toEqual(["⚠", "▶", "☑"]);
  });
  it("expands tabs to stops by display column", () => {
    expect(expandTabs("ab\tx")).toBe("ab  x");
    expect(expandTabs("名前\tx")).toBe("名前    x");
  });
  it("truncates by display width", () => {
    expect(truncate("東京東京東京", 8)).toBe("東京東…");
    expect(truncate("Design", 8)).toBe("Design");
    expect(truncate("Engineering", 8)).toBe("Enginee…");
  });
  it("keeps zero-width characters on the canvas without taking a column", () => {
    const c = new Canvas();
    c.put(0, 0, "a\u200bb|");
    c.put(1, 0, "\u200bab|");
    expect(c.toString()).toBe("a\u200bb|\n\u200bab|");
    expect(c.toString().split("\n").map(displayWidth)).toEqual([3, 3]);
  });
});

describe("fence", () => {
  it("uses three backticks, or more than the longest run inside", () => {
    expect(fence("a")).toBe("```\na\n```");
    expect(fence("```js\nx\n```")).toBe("````\n```js\nx\n```\n````");
  });
  it("handles more backtick runs than a call takes arguments", () => {
    expect(fence("`a".repeat(200_000)).startsWith("```\n")).toBe(true);
  });
});

describe("drawFormat", () => {
  it("turns a format that throws into a reason instead of crashing", () => {
    const broken: Format = {
      id: "broken",
      kind: "box",
      title: "Broken",
      render: () => {
        throw new Error("boom");
      },
    };
    expect(drawFormat(broken, "a")).toEqual({ out: "", reason: "Couldn't draw this input: boom." });
  });

  it("flags input too large to preview", () => {
    expect(inputTooLarge("x\n".repeat(MAX_INPUT_LINES))).toMatch(/2,001 lines/);
    expect(inputTooLarge("x".repeat(200_000))).toMatch(/200,000 characters/);
    expect(inputTooLarge("a\n  b")).toBeUndefined();
  });
});

describe("tree", () => {
  const expected = ["app", "├── src", "│   ├── ui", "│   └── lib", "└── docs"].join("\n");

  it.each([
    ["2-space", "app\n  src\n    ui\n    lib\n  docs"],
    ["4-space", "app\n    src\n        ui\n        lib\n    docs"],
    ["tabs", "app\n\tsrc\n\t\tui\n\t\tlib\n\tdocs"],
    ["dash bullets", "- app\n  - src\n    - ui\n    - lib\n  - docs"],
    ["star bullets", "* app\n  * src\n    * ui\n    * lib\n  * docs"],
    ["uneven indent", "app\n   src\n      ui\n      lib\n  docs"],
    ["already drawn", expected],
  ])("parses %s", (_, input) => {
    expect(renderTree(input)).toBe(expected);
  });

  it("re-renders a drawn tree in another style", () => {
    expect(renderTree(expected, "rounded")).toBe(
      expected.replace("└── docs", "╰── docs").replace("└── lib", "╰── lib"),
    );
    expect(renderTree(expected, "ascii")).toBe(["app", "|-- src", "|   |-- ui", "|   `-- lib", "`-- docs"].join("\n"));
  });

  it("aligns notes after labels into a column", () => {
    const annotated = [
      "src",
      "├── components      UI pieces",
      "│   └── Button.tsx  shared",
      "└── index.ts        entry",
    ];
    expect(renderTree("src\n\tcomponents\tUI pieces\n\t\tButton.tsx\tshared\n\tindex.ts\tentry")).toBe(
      annotated.join("\n"),
    );
    expect(renderTree("src\n  components  UI pieces\n    Button.tsx  shared\n  index.ts  entry")).toBe(
      annotated.join("\n"),
    );
    // Restyling a drawn tree keeps its notes.
    expect(renderTree(annotated.join("\n"), "heavy").split("\n")[1]).toBe("┣━━ components      UI pieces");
  });

  it("keeps the tree column left-aligned even when labels are numbers", () => {
    expect(renderTree("years\n  2024  12\n  2025  3")).toBe(["years", "├── 2024  12", "└── 2025   3"].join("\n"));
  });

  it("draws several roots as siblings", () => {
    expect(renderTree("a\n  a1\nb")).toBe("├── a\n│   └── a1\n└── b");
  });

  it("keeps list numbers, which are part of the label, and drops symbol bullets", () => {
    expect(renderTree("Plan\n  1. Setup\n    1.1 Install\n  - Build")).toBe(
      ["Plan", "├── 1. Setup", "│   └── 1.1 Install", "└── Build"].join("\n"),
    );
  });
});

describe("box", () => {
  it("fits the widest line, including wide characters", () => {
    const out = renderBox("Header\n---\nsome longer body\n日本 ✅");
    rect(out);
    expect(out).toBe(
      [
        "┌──────────────────┐",
        "│ Header           │",
        "├──────────────────┤",
        "│ some longer body │",
        "│ 日本 ✅          │",
        "└──────────────────┘",
      ].join("\n"),
    );
  });
  it.each(["rounded", "heavy", "double", "ascii"] as const)("%s style stays rectangular", (style) => {
    rect(renderBox("one\ntwo three", { style }));
  });
});

describe("table", () => {
  const cells = [
    ["Name", "Qty"],
    ["apples", "12"],
    ["kiwi", "3"],
  ];
  it.each([
    ["tab", "Name\tQty\napples\t12\nkiwi\t3"],
    ["pipe", "| Name | Qty |\n|---|---|\n| apples | 12 |\n| kiwi | 3 |"],
    ["spaces", "Name    Qty\napples  12\nkiwi    3"],
    ["comma", "Name,Qty\napples,12\nkiwi,3"],
  ])("parses %s-delimited rows", (_, input) => {
    expect(parseTable(input)).toEqual(cells);
  });

  it("keeps quoted commas and escaped pipes inside their cell", () => {
    expect(parseTable('Name,Notes\napples,"cheap, ripe"\npears,"say ""hi"""')).toEqual([
      ["Name", "Notes"],
      ["apples", "cheap, ripe"],
      ["pears", 'say "hi"'],
    ]);
    expect(parseTable('Name,Notes\napples,"cheap,  ripe"')).toEqual([
      ["Name", "Notes"],
      ["apples", "cheap,  ripe"],
    ]);
    expect(parseTable("| a | b |\n| --- | --- |\n| x \\| y | z |")).toEqual([
      ["a", "b"],
      ["x | y", "z"],
    ]);
  });

  it("splits after an escaped backslash, like GitHub", () => {
    expect(
      parseTable(String.raw`| path | note |
| C:\\| root |
| a | C:\\|`),
    ).toEqual([
      ["path", "note"],
      ["C:\\", "root"],
      ["a", "C:\\"],
    ]);
  });

  it("round-trips cells with pipes and backslashes through markdown output", () => {
    const cells = [
      ["Path", "Note"],
      ["C:\\|tail", "a|b"],
      ["x\\\\|y", "end\\"],
      ["C:\\path", "\\*lit\\*"],
      ["\\\\server\\share", "a*b_c"],
    ];
    const markdown = renderTable(cells.map((r) => r.join("\t")).join("\n"), "markdown").split("\n");
    // Escaped only where GitHub would read a backslash as an escape; C:\path stays readable.
    expect(markdown.slice(2).map((l) => l.split(" | ")[0])).toEqual([
      "| C:\\\\\\|tail     ",
      "| x\\\\\\\\\\|y       ",
      "| C:\\path        ",
      "| \\\\\\server\\share",
    ]);
    expect(parseTable(markdown.join("\n"))).toEqual(cells);
  });

  it("keeps a markdown table's escapes as written, and resolves them elsewhere", () => {
    const input = "| a | b |\n| --- | --- |\n| \\*kept\\* | C:\\\\ |";
    expect(renderTable(input, "markdown").split("\n")[2]).toBe("| \\*kept\\* | C:\\\\ |");
    expect(renderTable(input, "light").split("\n")[3]).toBe("│ *kept* │ C:\\ │");
  });

  it("leaves backslashes in code spans alone, both ways", () => {
    expect(parseTable("| a | b |\n| --- | --- |\n| `C:\\*` | `a\\|b` \\*x\\* |")[1]).toEqual(["`C:\\*`", "`a|b` *x*"]);
    const cells = [
      ["Code", "Note"],
      ["`C:\\*`", "`a|b`"],
      ["\\`not code", "``tick ` in``"],
    ];
    const markdown = renderTable(cells.map((r) => r.join("\t")).join("\n"), "markdown");
    expect(markdown.split("\n")[2]).toBe("| `C:\\*`      | `a\\|b`        |");
    expect(parseTable(markdown)).toEqual(cells);
  });

  it("escapes pipes inside cells in markdown output", () => {
    expect(renderTable('Name,Notes\napples,"a|b"', "markdown").split("\n")[2]).toBe("| apples | a\\|b  |");
    expect(renderTable("| a | b |\n| --- | --- |\n| x \\| y | z |", "markdown").split("\n")[2]).toBe(
      "| x \\| y | z   |",
    );
  });

  it("pads ragged rows and right-aligns numbers", () => {
    const out = renderTable("a\tb\tc\n1\t2\nx\t3\t4");
    rect(out);
    expect(out.split("\n")[3]).toBe("│ 1   │   2 │     │");
  });

  it("renders markdown with a right-aligned separator for numeric columns", () => {
    expect(renderTable("Name\tQty\napples\t12", "markdown")).toBe(
      ["| Name   | Qty |", "| ------ | --: |", "| apples |  12 |"].join("\n"),
    );
  });
});

describe("column alignment", () => {
  const bills = "ITEM\tDUE DATE\tAMOUNT\nRent/mortgage\t[Date]\t$800.00\nGas\t[Date]\t$50.00";

  it("plain table aligns columns and right-aligns amounts", () => {
    expect(renderTable(bills, "plain")).toBe(
      [
        "ITEM           DUE DATE   AMOUNT",
        "─────────────  ────────  ───────",
        "Rent/mortgage  [Date]    $800.00",
        "Gas            [Date]     $50.00",
      ].join("\n"),
    );
  });

  it("box aligns tab-separated lines instead of using fixed tab stops", () => {
    const out = renderBox("Bills\n---\n" + bills);
    rect(out);
    expect(out.split("\n")[3]).toBe("│ ITEM           DUE DATE   AMOUNT │");
    expect(out.split("\n")[5]).toBe("│ Gas            [Date]     $50.00 │");
  });
});

describe("flow", () => {
  it.each(["A > B > C", "A -> B -> C", "A → B → C", "A => B ⇒ C", "A\nB\nC"])("splits %j", (input) => {
    expect(parseFlow(input)).toEqual(["A", "B", "C"]);
  });

  it("keeps a > that isn't an arrow inside its step", () => {
    expect(parseFlow("Check count > 0\nRetry if x >= 5\nShip")).toEqual(["Check count > 0", "Retry if x >= 5", "Ship"]);
    expect(parseFlow("Render <div> > Done")).toEqual(["Render <div>", "Done"]);
  });
  it("splits a > between words on any line, one step per line or not", () => {
    expect(parseFlow("Draft > Review\nApproved")).toEqual(["Draft", "Review", "Approved"]);
    expect(parseFlow("Setup > 2FA > Done\nBudget > $5")).toEqual(["Setup", "2FA", "Done", "Budget > $5"]);
  });
  it("renders inline, across and down", () => {
    expect(renderFlowInline("Draft > Review > Merged")).toBe("Draft → Review → Merged");
    expect(renderFlowHorizontal("Draft > Review")).toBe(
      ["┌───────┐   ┌────────┐", "│ Draft │──►│ Review │", "└───────┘   └────────┘"].join("\n"),
    );
    const down = renderFlowVertical("Login > Home");
    expect(down).toBe(
      ["┌───────┐", "│ Login │", "└───┬───┘", "    ▼", "┌───────┐", "│ Home  │", "└───────┘"].join("\n"),
    );
  });
});

describe("sequence", () => {
  it("draws lanes, solid calls, dashed replies, crossings and self-calls", () => {
    expect(renderSequence("Web -> API: login\nAPI -> API: check\nAPI --> Web: token\nWeb -> DB: skip")).toBe(
      [
        "Web          API          DB",
        " │            │            │",
        " │─ login ───►│            │",
        " │            │ ↻ check    │",
        " │◄┄┄┄ token ┄│            │",
        " │─ skip ─────┼───────────►│",
        " │            │            │",
      ].join("\n"),
    );
  });

  it("leaves room for a self-call on the last lane", () => {
    expect(renderSequence("A -> A: retry").split("\n")[2]).toBe("│ ↻ retry");
    expect(renderSequence("A -> B: go\nB -> B: retry").split("\n")[3]).toBe("│            │ ↻ retry");
  });
});

describe("detect", () => {
  it.each([
    ["Web -> API: login\nAPI --> Web: token", "sequence"],
    ["app\n  src\n  docs", "tree"],
    ["- a\n- b", "tree"],
    ["Name\tQty\na\t1", "table"],
    ["Draft > Review > Merged", "flow"],
    ["Just a note", "box"],
  ])("%j → %s", (input, kind) => {
    expect(detectKinds(input)[0]).toBe(kind);
  });
});

describe("unusable", () => {
  const oneLine = "I've written the summary to /";
  it("rejects a single line for every kind except box", () => {
    expect(unusable("box", oneLine)).toBeUndefined();
    for (const kind of ["tree", "table", "flow", "sequence"] as const) expect(unusable(kind, oneLine)).toBeTruthy();
  });
  it("accepts real input", () => {
    expect(unusable("tree", "a\n  b")).toBeUndefined();
    expect(unusable("tree", "a\nb")).toBeUndefined();
    expect(unusable("table", "a\tb")).toBeUndefined();
    expect(unusable("flow", "a > b")).toBeUndefined();
    expect(unusable("sequence", "a -> b: hi")).toBeUndefined();
  });
  it("names a sequence line that isn't a message instead of dropping it", () => {
    expect(unusable("sequence", "A -> B: go\nNote: retry later\nB --> A: ok")).toBe(
      "“Note: retry later” isn't a message.",
    );
    expect(unusable("sequence", "A -> B: go\n\nB --> A: ok")).toBeUndefined();
  });
});
