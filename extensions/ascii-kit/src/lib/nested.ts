import { BoxStyle, renderBox } from "./box";
import { TreeNode, parseTree } from "./tree";
import { displayWidth } from "./width";

// Outermost container is double, then light, then rounded, then light again.
const STYLE_BY_DEPTH: BoxStyle[] = ["double", "light", "rounded"];
const styleAt = (depth: number) => STYLE_BY_DEPTH[depth] ?? (depth % 2 ? "rounded" : "light");

const labelOf = (n: TreeNode) => [n.label, ...n.notes].join("  ");

/** The narrowest outer width this node can be drawn at. */
function naturalWidth(node: TreeNode): number {
  if (!node.children.length) return displayWidth(labelOf(node));
  const inner = Math.max(displayWidth(labelOf(node)) + 2, ...node.children.map(naturalWidth));
  return inner + 4;
}

/** A node with children is a titled box holding them; a leaf is a line of text inside its parent. */
function render(node: TreeNode, width: number, depth: number): string {
  if (!node.children.length) return labelOf(node);
  const inner = width - 4;
  const body = node.children.map((child) => render(child, inner, depth + 1)).join("\n");
  return renderBox(body, { style: styleAt(depth), title: labelOf(node), minWidth: inner });
}

/** An indented list drawn as boxes inside boxes: containment rather than hierarchy. */
export function renderNested(input: string): string {
  const roots = parseTree(input);
  if (!roots.length) return "";
  const width = Math.max(...roots.map(naturalWidth));
  return roots.map((r) => render(r, width, 0)).join("\n");
}
