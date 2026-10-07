import { BIG_ARROWS, OUTLINE_NOTE, SOLID_NOTE, labelledArrow } from "../lib/arrows";
import { renderBox, renderTitledBox } from "../lib/box";
import { alignRows } from "../lib/columns";
import { renderFlowHorizontal, renderFlowVertical } from "../lib/flow";
import { sideBySide, spaced, stack, withShadow } from "../lib/layout";
import { renderSequence } from "../lib/sequence";
import { renderTable } from "../lib/table";
import { renderCallouts } from "../lib/callouts";
import { renderGantt, renderKanban } from "../lib/planning";
import { renderTree } from "../lib/tree";
import { displayWidth, padEnd } from "../lib/width";

export type TemplateGroup = "Basics" | "Flow & structure" | "UI & TUI" | "Planning & data" | "Code";

export interface Template {
  title: string;
  group: TemplateGroup;
  useFor: string;
  text: string;
  /** Fence language for Copy as Code Block, e.g. `diff` so GitHub colors it. */
  lang?: string;
  /** How to regenerate it from your own content with Compose Diagram, if possible. */
  composeHint?: string;
}

const lines = (...rows: string[]) => rows.join("\n");

/** Boxed tabs; the selected one is open at the bottom so it joins its content. */
function tabs(labels: string[], selected: number): string {
  const top = labels.map((l) => "╭" + "─".repeat(displayWidth(l) + 2) + "╮").join("");
  const mid = labels.map((l) => `│ ${l} │`).join("");
  const bottom = labels
    .map((l, i) => {
      const w = displayWidth(l) + 2;
      return i === selected ? "╯" + " ".repeat(w) + "╰" : "┴" + "─".repeat(w) + "┴";
    })
    .join("");
  return lines(" " + top, " " + mid, "─" + bottom + "─────");
}

/** ●━━━●━━━◉───○ with labels under each node; done steps are heavy, the rest light. */
function stepper(labels: string[], current: number): string {
  const gaps = labels.map((l) => Math.max(displayWidth(l) + 2, 8));
  let track = "";
  let names = "";
  labels.forEach((l, i) => {
    const node = i < current ? "●" : i === current ? "◉" : "○";
    const last = i === labels.length - 1;
    track += node + (last ? "" : (i < current ? "━" : "─").repeat(gaps[i] - 1));
    names += last ? l : padEnd(l, gaps[i]);
  });
  return lines(track, names);
}

function heatmap(): string {
  const shades = ["░", "▒", "▓", "█"];
  const weeks = [
    [0, 1, 2, 3, 1],
    [1, 2, 3, 2, 0],
    [0, 0, 1, 2, 3],
  ];
  const cell = (v: number) => shades[v].repeat(3);
  return lines(
    "        Mon Tue Wed Thu Fri",
    ...weeks.map((w, i) => `Week ${i + 1}  ${w.map(cell).join(" ")}`),
    "",
    "        ░ low  ▒  ▓  █ high",
  );
}

/** A rounded box with a tail under its left side pointing at who said it. */
function bubble(text: string, who: string): string {
  const box = renderBox(text, { style: "rounded" }).split("\n");
  const bottom = box[box.length - 1];
  box[box.length - 1] = bottom.slice(0, 3) + "┬" + bottom.slice(4);
  return lines(...box, `   ╰─ ${who}`);
}

export const TEMPLATES: Template[] = [
  // ── Basics ─────────────────────────────────────────────────────────────
  {
    title: "Box with header",
    group: "Basics",
    useFor: "A single component, card or concept with a title and details.",
    text: renderBox("Title\n---\nFirst detail\nSecond detail"),
    composeHint: "Box · light. A line of --- becomes the divider.",
  },
  {
    title: "Tree",
    group: "Basics",
    useFor: "File structure, component hierarchy, navigation, org of concepts.",
    text: renderTree("root\n  child\t\tnote\n    grandchild\n    grandchild\n  child\n    grandchild\n  child\t\tnote"),
    composeHint: "Tree · light, from an indented or bulleted list. A tab after a name adds a note.",
  },
  {
    title: "Compare A | B",
    group: "Basics",
    useFor: "Two options side by side with trade-offs, for a decision in a PR or thread.",
    text: renderTable(
      "Option A\tOption B\n✓ Strength\t✓ Strength\n✓ Strength\t✗ Weakness\n✗ Weakness\t✗ Weakness",
      "light",
    ),
    composeHint: "Table · box, from tab- or pipe-separated rows.",
  },
  {
    title: "Option picker",
    group: "Basics",
    useFor: "Presenting choices with one recommended, like the Claude Code question picker.",
    text: lines(
      "  How should we handle it?",
      "",
      "❯ 1. Option one (Recommended)",
      "     What it means and its trade-off.",
      "  2. Option two",
      "     What it means and its trade-off.",
      "  3. Option three",
      "     What it means and its trade-off.",
    ),
  },
  {
    title: "Checklist",
    group: "Basics",
    useFor: "Status of a set of tasks in a PR description or standup.",
    text: lines("✓ Done item", "✓ Done item", "◐ In progress", "○ Not started", "✗ Dropped: reason"),
  },
  {
    title: "Markdown table",
    group: "Basics",
    useFor:
      "Where the destination renders markdown tables (GitHub, Notion, Linear). `--:` right-aligns a number column.",
    text: renderTable("Column\tColumn\tCount\nvalue\tvalue\t1\nvalue\tvalue\t20", "markdown"),
    composeHint: "Table · markdown.",
  },

  // ── Flow & structure ───────────────────────────────────────────────────
  {
    title: "Steps, stacked",
    group: "Flow & structure",
    useFor: "A linear process read top to bottom: onboarding, a pipeline, a migration.",
    text: renderFlowVertical("Step one > Step two > Step three"),
    composeHint: "Flow · boxes down, from `A > B > C` or one step per line.",
  },
  {
    title: "Steps, stacked, heavy arrows",
    group: "Flow & structure",
    useFor: "The same, with arrows that carry more weight: a slide-like overview in a PR or doc.",
    text: stack([renderBox("Step one"), renderBox("Step two"), renderBox("Step three")], BIG_ARROWS.heavyDown),
  },
  {
    title: "Steps, across",
    group: "Flow & structure",
    useFor: "A short linear flow that fits on one line: states, stages, handoffs.",
    text: renderFlowHorizontal("Draft > In review > Merged"),
    composeHint: "Flow · boxes across.",
  },
  {
    title: "Before → after",
    group: "Flow & structure",
    useFor: "A change to a structure or layout: what it was and what it becomes.",
    text: sideBySide(
      [
        renderBox("Before\n---\nPage\n  Header\n  Old panel\n  Footer"),
        renderBox("After\n---\nPage\n  Header\n  New panel\n  Footer"),
      ],
      " ──► ",
    ),
  },
  {
    title: "Before → after, labeled",
    group: "Flow & structure",
    useFor: "The same change, with the transformation named on a heavy arrow. Works in every font.",
    text: sideBySide(
      [
        renderBox("Before\n---\nPage\n  Header\n  Old panel\n  Footer"),
        renderBox("After\n---\nPage\n  Header\n  New panel\n  Footer"),
      ],
      spaced(labelledArrow("becomes"), 2),
    ),
  },
  {
    title: "Before → after, outline arrow",
    group: "Flow & structure",
    useFor: `The transformation as the headline, with an outline arrow. ${OUTLINE_NOTE}`,
    text: sideBySide(
      [
        renderBox("Before\n---\nPage\n  Header\n  Old panel\n  Footer"),
        renderBox("After\n---\nPage\n  Header\n  New panel\n  Footer"),
      ],
      spaced(BIG_ARROWS.outlineRight, 2),
    ),
  },
  {
    title: "Before → after, solid arrow",
    group: "Flow & structure",
    useFor: `The transformation as the headline, with a solid block arrow. ${SOLID_NOTE}`,
    text: sideBySide(
      [
        renderBox("Before\n---\nPage\n  Header\n  Old panel\n  Footer"),
        renderBox("After\n---\nPage\n  Header\n  New panel\n  Footer"),
      ],
      spaced(BIG_ARROWS.solidRight, 2),
    ),
  },
  {
    title: "Sequence",
    group: "Flow & structure",
    useFor: "Who calls whom, in order: requests, events, handoffs between people or systems.",
    text: renderSequence(
      "Client -> Server: request\nServer -> Store: read\nStore --> Server: data\nServer --> Client: response",
    ),
    composeHint: "Sequence · lanes, from `A -> B: label` lines (--> for a dashed reply).",
  },
  {
    title: "State machine",
    group: "Flow & structure",
    useFor: "States and the transitions between them, including a loop back.",
    text: lines(
      "┌────────┐  submit  ┌──────────┐  approve  ┌──────────┐",
      "│ Draft  │─────────►│ Review   │──────────►│ Approved │",
      "└────────┘          └────┬─────┘           └──────────┘",
      "     ▲                   │",
      "     └───── reject ──────┘",
    ),
  },
  {
    title: "Decision diamond",
    group: "Flow & structure",
    useFor: "A flowchart branch: one question, a yes path and a no path.",
    text: lines(
      "          ┌───────────┐",
      "          │ Submitted │",
      "          └─────┬─────┘",
      "                ▼",
      "               ╱╲",
      "       no ◄───╱ok╲───► yes",
      "       │      ╲  ╱      │",
      "       ▼       ╲╱       ▼",
      "  ┌────────┐       ┌─────────┐",
      "  │ Revise │       │ Publish │",
      "  └────────┘       └─────────┘",
    ),
  },
  {
    title: "Decision tree",
    group: "Flow & structure",
    useFor: "Branching logic: if this, then that. Good for triage and rules.",
    text: renderTree(
      "Is it blocking?\n  yes  → Fix now\n  no\n    Affects many users?  → Next sprint\n    Edge case?  → Backlog",
    ),
    composeHint: "Tree · light: write the outcome after 2+ spaces and the arrows line up.",
  },
  {
    title: "Git graph",
    group: "Flow & structure",
    useFor: "Branches and merges: explaining a rebase, a release branch, or what landed where.",
    text: alignRows(
      [
        ["●", "a1f3", "main", "Merge feature/search"],
        ["├─╮"],
        ["│ ●", "9c2e", "feature", "Add result cards"],
        ["│ ●", "47bd", "feature", "Search hook"],
        ["├─╯"],
        ["●", "e810", "main", "Initial layout"],
      ],
      "  ",
      4,
    ).join("\n"),
  },
  {
    title: "Service → database",
    group: "Flow & structure",
    useFor: "Architecture sketches: a service and the store it reads and writes.",
    text: lines(
      "┌─────────┐        ╭──────────╮",
      "│ Service │───────►├──────────┤",
      "└─────────┘        │ Database │",
      "                   ╰──────────╯",
    ),
  },

  // ── UI & TUI ───────────────────────────────────────────────────────────
  {
    title: "Layout wireframe",
    group: "UI & TUI",
    useFor: "Rough screen structure: where regions sit, before anything is designed.",
    text: lines(
      "╔══════════════════════════════════════════╗",
      "║ Header                        [ Action ] ║",
      "╠════════════╦═════════════════════════════╣",
      "║ Sidebar    ║ Content                     ║",
      "║            ║                             ║",
      "║ › Item     ║ ┌─────────────┬───────────┐ ║",
      "║ › Item     ║ │ Card        │ Card      │ ║",
      "║ › Item     ║ └─────────────┴───────────┘ ║",
      "║            ║                             ║",
      "╚════════════╩═════════════════════════════╝",
    ),
  },
  {
    title: "Numbered callouts",
    group: "UI & TUI",
    useFor: "A wireframe with numbered regions and a legend, for feedback that points at parts.",
    text: lines(
      "┌──────────────────────────────────┐",
      "│ (1) Logo              (2) Menu   │",
      "├─────────────┬────────────────────┤",
      "│ (3) Filters │ (4) Results        │",
      "│             │                    │",
      "└─────────────┴────────────────────┘",
      "(1) Links home",
      "(2) Account and settings",
      "(3) Sticky while scrolling",
      "(4) 20 per page, paged",
    ),
  },
  {
    title: "Claude session",
    group: "UI & TUI",
    useFor: "Mocking or describing an agent or CLI conversation: calls, results, thinking, input.",
    text: lines(
      "❯ Rename the search hook and update its callers",
      "",
      "● Read(src/hooks/useSearch.ts)",
      "  ⎿  Read 42 lines",
      "",
      "● Update(src/hooks/useSearch.ts)",
      "  ⎿  Updated with 3 additions and 1 removal",
      "",
      "✻ Thinking…",
      "",
      renderBox("❯", { style: "rounded", minWidth: 44 }),
      "  ⏵⏵ accept edits on · shift+tab to cycle",
    ),
  },
  {
    title: "Form controls",
    group: "UI & TUI",
    useFor: "A settings or form mock: inputs, dropdowns, checkboxes, radios, toggles, buttons.",
    text: alignRows(
      [
        ["Name", "[ Ada Lovelace          ]"],
        ["Role", "Designer ▾"],
        ["Notify", "[x] Email   [ ] Slack"],
        ["Billing", "(•) Monthly   ( ) Yearly"],
        ["Dark mode", "(   ●) On"],
        ["Autoplay", "(●   ) Off"],
        ["Volume", "━━━━━━●───── 50%"],
        [""],
        ["", "[ Cancel ]  [ Save ]"],
      ],
      "  ",
      2,
    ).join("\n"),
  },
  {
    title: "Tabs",
    group: "UI & TUI",
    useFor: "Tabbed navigation; the selected tab is open into its content.",
    text: lines(tabs(["Overview", "Activity", "Settings"], 0), "  Content of the selected tab"),
  },
  {
    title: "Modal",
    group: "UI & TUI",
    useFor: "A dialog over the page, with a shadow so it reads as floating.",
    text: withShadow(renderBox("Delete 3 files?\n---\nThis can't be undone.\n\n      [ Cancel ]  [ Delete ]")),
  },
  {
    title: "Panels",
    group: "UI & TUI",
    useFor: "A multi-pane TUI (lazygit, btop style): titled panels and a key-hint footer.",
    text: lines(
      sideBySide(
        [
          renderTitledBox("Files\n▾ src\n  ● app.ts\n  ○ index.ts\n▸ tests"),
          renderTitledBox("Diff\n  const q = input\n- search(q)\n+ search(q, { limit })\n  render()"),
        ],
        "",
      ),
      " ↵ open · ⇥ switch pane · q quit",
    ),
    composeHint: "Box · titled: the first line goes into the top border.",
  },
  {
    title: "Loading states",
    group: "UI & TUI",
    useFor: "Specifying every state of an async element: idle, loading, done, empty, error.",
    text: alignRows([
      ["Idle", "○ Search"],
      ["Loading", "⠋ Searching…"],
      ["Done", "✓ 20 results"],
      ["Empty", "∅ No results · try another term"],
      ["Error", "✗ Couldn't reach the server · ↻ retry"],
    ]).join("\n"),
  },
  {
    title: "Speech bubble",
    group: "UI & TUI",
    useFor: "A quote, a comment, or what a user or system says in a flow.",
    text: bubble("Looks good to me", "Reviewer"),
  },

  // ── Planning & data ────────────────────────────────────────────────────
  {
    title: "Progress bars",
    group: "Planning & data",
    useFor: "Relative amounts at a glance: completion, share, capacity.",
    text: lines(
      "Design    ████████████████████ 100%",
      "Build     ████████████░░░░░░░░  60%",
      "Testing   ████░░░░░░░░░░░░░░░░  20%",
      "Launch    ░░░░░░░░░░░░░░░░░░░░   0%",
    ),
  },
  {
    title: "Gauges",
    group: "Planning & data",
    useFor: "Compact meters for a status update: usage, capacity, confidence.",
    text: lines(
      ...alignRows([
        ["CPU", "[■■■■■■□□□□]", "60%"],
        ["Memory", "[■■■■■■■■□□]", "80%"],
        ["Disk", "[■■□□□□□□□□]", "20%"],
      ]),
      "",
      "◔ 25%   ◑ 50%   ◕ 75%   ● 100%",
    ),
  },
  {
    title: "Stepper",
    group: "Planning & data",
    useFor: "Where something is in a fixed sequence: checkout, onboarding, a release train.",
    text: stepper(["Cart", "Shipping", "Payment", "Review", "Done"], 2),
  },
  {
    title: "2×2 matrix",
    group: "Planning & data",
    useFor: "Prioritizing on two axes: impact and effort, urgency and importance.",
    text: lines(
      "                High impact",
      "                     │",
      "     Quick wins      │      Big bets",
      "                     │",
      "Low effort ──────────┼──────────► High effort",
      "                     │",
      "     Fill-ins        │      Money pits",
      "                     │",
      "                Low impact",
    ),
  },
  {
    title: "Heatmap",
    group: "Planning & data",
    useFor: "Intensity over a grid: activity by day, load by hour, coverage by area.",
    text: heatmap(),
  },

  {
    title: "Gantt chart",
    group: "Planning & data",
    useFor: "A schedule in a PR or planning thread: who does what, when, and what overlaps.",
    text: renderGantt("Week\nDiscovery 1 1\nDesign 2-3\nBuild 3 3.5\nQA 5.5 1.5\nLaunch 7 0.5"),
    composeHint:
      "Plan · Gantt, from `task start length` or `task 2-4` rows. A first line like `Sprint` names the unit.",
  },
  {
    title: "Kanban board",
    group: "Planning & data",
    useFor: "Where work stands, column by column: a standup, a sprint review, a handover.",
    text: renderKanban(
      "Todo\tDoing\tDone\n○ Spec\t◐ Search\t✓ Login\n○ Empty state\t◐ Cards\t✓ Nav\n○ Copy\t\t✓ Footer",
    ),
    composeHint: "Table · kanban board, from a table whose header row holds the columns.",
  },

  // ── Code ───────────────────────────────────────────────────────────────
  {
    title: "Code callouts",
    group: "Code",
    useFor: "Review comments that point at exact parts of a line, the way compiler errors do.",
    text: renderCallouts(
      "const hits = await search(q, { limit })\nawait: blocks render\nq: not trimmed\nlimit: unset on load",
    ),
    composeHint: "Code · callouts: the code, then one `target: note` line per thing to point at.",
  },
  {
    title: "Line-number gutter",
    group: "Code",
    useFor: "Quoting code with line numbers and pointing at the changed line.",
    text: lines(
      " 12 │ const results = search(query)",
      " 13 │ if (!results.length) return empty   ◄ changed",
      " 14 │ render(results)",
    ),
  },
  {
    title: "Diff",
    group: "Code",
    useFor: "A suggested change. Copy as Code Block uses ```diff, which GitHub colors red and green.",
    lang: "diff",
    text: lines(
      "  const results = search(query)",
      "- if (!results) return null",
      "+ if (!results.length) return empty",
      "  render(results)",
    ),
  },
];

export const TEMPLATE_GROUPS: TemplateGroup[] = ["Basics", "Flow & structure", "UI & TUI", "Planning & data", "Code"];
