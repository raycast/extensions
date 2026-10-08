import { renderBox } from "./box";
import { Canvas, setAt } from "./canvas";
import { TreeNode, parseTree } from "./tree";
import { displayWidth } from "./width";

const GAP = 3;

interface Laid {
  /** Draws the subtree with its top-left at (row, col). */
  draw: (canvas: Canvas, row: number, col: number) => void;
  width: number;
  /** Column of the root box's centre, relative to the subtree's left edge. */
  anchor: number;
}

function nodeBox(node: TreeNode): string[] {
  const text = [node.label, ...(node.notes.length ? [node.notes.join("  ")] : [])].join("\n");
  const lines = renderBox(text, { align: "center" }).split("\n");
  // An odd width gives the box a single centre column for the connector joints.
  if (displayWidth(lines[0]) % 2 === 0) {
    return renderBox(text, { align: "center", minWidth: displayWidth(lines[0]) - 3 }).split("\n");
  }
  return lines;
}

function layout(node: TreeNode): Laid {
  const box = nodeBox(node);
  const boxWidth = displayWidth(box[0]);
  const centre = Math.floor(boxWidth / 2);

  if (!node.children.length) {
    return { width: boxWidth, anchor: centre, draw: (c, r, x) => c.block(r, x, box.join("\n")) };
  }

  const kids = node.children.map(layout);
  const offsets: number[] = [];
  let x = 0;
  for (const k of kids) {
    offsets.push(x);
    x += k.width + GAP;
  }
  const kidsWidth = x - GAP;
  const anchors = kids.map((k, i) => offsets[i] + k.anchor);
  // Centre on the midpoint of the outer children, but snap to a child's centre when it's within
  // two columns: otherwise the joints land side by side (┴┬) and read as a glitch.
  const midpoint = Math.floor((anchors[0] + anchors[anchors.length - 1]) / 2);
  const near = anchors.find((a) => Math.abs(a - midpoint) <= 2);
  const mid = near ?? midpoint;

  // Centre the parent over its children; shift whichever side would start left of 0.
  const parentLeft = mid - centre;
  const shiftKids = Math.max(0, -parentLeft);
  const shiftParent = Math.max(0, parentLeft);
  const width = Math.max(kidsWidth + shiftKids, shiftParent + boxWidth);

  const parent = [...box];
  parent[parent.length - 1] = setAt(parent[parent.length - 1], centre, "┬");

  return {
    width,
    anchor: shiftParent + centre,
    draw: (c, r, left) => {
      c.block(r, left + shiftParent, parent.join("\n"));
      const connectorRow = r + parent.length;
      const cols = anchors.map((a) => left + shiftKids + a);
      const joint = left + shiftParent + centre;
      if (cols.length === 1) {
        c.put(connectorRow, joint, "│");
      } else {
        for (let col = cols[0]; col <= cols[cols.length - 1]; col++) c.put(connectorRow, col, "─");
        cols.forEach((col, i) => c.put(connectorRow, col, i === 0 ? "┌" : i === cols.length - 1 ? "┐" : "┬"));
        const onChild = cols.indexOf(joint);
        const edge = onChild === 0 ? "├" : onChild === cols.length - 1 ? "┤" : onChild > 0 ? "┼" : "┴";
        c.put(connectorRow, joint, edge);
      }
      kids.forEach((k, i) => {
        const kidLeft = left + shiftKids + offsets[i];
        const kidRow = connectorRow + 1;
        k.draw(c, kidRow, kidLeft);
        c.put(kidRow, kidLeft + k.anchor, "┴");
      });
    },
  };
}

/** An indented list drawn top-down, like an org chart. Several roots sit side by side. */
export function renderOrgChart(input: string): string {
  const roots = parseTree(input);
  if (!roots.length) return "";
  const canvas = new Canvas();
  let left = 0;
  for (const root of roots) {
    const laid = layout(root);
    laid.draw(canvas, 0, left);
    left += laid.width + GAP;
  }
  return canvas.toString();
}
