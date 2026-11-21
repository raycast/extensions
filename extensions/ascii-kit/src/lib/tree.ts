import { alignRows } from "./columns";
import { expandTabs, splitLines } from "./width";

export type TreeStyle = "light" | "rounded" | "heavy" | "ascii";

const STYLES: Record<TreeStyle, { tee: string; ell: string; pipe: string }> = {
  light: { tee: "├── ", ell: "└── ", pipe: "│   " },
  rounded: { tee: "├── ", ell: "╰── ", pipe: "│   " },
  heavy: { tee: "┣━━ ", ell: "┗━━ ", pipe: "┃   " },
  ascii: { tee: "|-- ", ell: "`-- ", pipe: "|   " },
};

export interface TreeNode {
  label: string;
  /** Extra columns after the label, aligned when drawn: sizes, owners, descriptions. */
  notes: string[];
  children: TreeNode[];
}

// Characters that already-drawn trees use as prefix. Treating them as indentation lets you
// re-render an existing tree in a different style.
const TREE_PREFIX = /^(?:[ │├└─┃┣┗━╰]|\| {3}|\|-- |`-- )*/u;
// Only symbol bullets are markup; a number (`1. Setup`) is part of the label and is kept.
const BULLET = /^[-*+•◦▪]\s+/u;
// Leading whitespace is nesting; a tab or 2+ spaces after the label starts a note column.
const NOTE_SEPARATOR = /\t+| {2,}/;

/** Parses an indented, bulleted, or previously drawn tree into nodes. */
export function parseTree(input: string): TreeNode[] {
  const roots: TreeNode[] = [];
  // Stack of [indent, node]; the virtual root sits at indent -1.
  const stack: { indent: number; children: TreeNode[] }[] = [{ indent: -1, children: roots }];

  for (const raw of splitLines(input)) {
    // Expand only leading tabs: tabs after the label are column separators.
    const lead = raw.match(/^[\t ]*/)?.[0] ?? "";
    const line = (expandTabs(lead) + raw.slice(lead.length)).trimEnd();
    if (!line.trim()) continue;

    const prefix = line.match(TREE_PREFIX)?.[0] ?? "";
    const indent = prefix.length;
    const [label, ...notes] = line
      .slice(prefix.length)
      .replace(BULLET, "")
      .split(NOTE_SEPARATOR)
      .map((c) => c.trim())
      .filter(Boolean);
    if (!label) continue;

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    const node: TreeNode = { label, notes, children: [] };
    stack[stack.length - 1].children.push(node);
    stack.push({ indent, children: node.children });
  }
  return roots;
}

type Row = [string, ...string[]];

function renderChildren(nodes: TreeNode[], prefix: string, s: (typeof STYLES)[TreeStyle], out: Row[]) {
  nodes.forEach((node, i) => {
    const last = i === nodes.length - 1;
    out.push([prefix + (last ? s.ell : s.tee) + node.label, ...node.notes]);
    renderChildren(node.children, prefix + (last ? "    " : s.pipe), s, out);
  });
}

/**
 * A single top-level item is drawn as a plain root with its children below it (like `tree`).
 * Several top-level items are drawn as siblings, each with a connector.
 */
export function renderTree(input: string, style: TreeStyle = "light"): string {
  const roots = parseTree(input);
  const s = STYLES[style];
  const out: Row[] = [];
  if (roots.length === 1) {
    out.push([roots[0].label, ...roots[0].notes]);
    renderChildren(roots[0].children, "", s, out);
  } else {
    renderChildren(roots, "", s, out);
  }
  if (out.every((r) => r.length === 1)) return out.map((r) => r[0].trimEnd()).join("\n");
  return alignRows(out, "  ", 1).join("\n");
}
