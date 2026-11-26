// Pure layered layout + SVG for DAG lineage, rendered inside Raycast (Detail markdown image).
// Columns: upstream depth on the left (-k), root at 0, downstream on the right (+k).
// Within a column, rows are ordered by a few barycenter sweeps to reduce edge crossings.

import { Theme } from "./charts";
import { KIND_LABEL, LineageEdge, LineageGraph, SignalKind, traverse } from "./lineage";

const PALETTE = {
  dark: {
    bg: "#1f1f21",
    text: "#1b1b1d",
    mute: "#9a9a9a",
    title: "#e6e6e6",
    root: "#fc9867",
    up: "#78dce8",
    down: "#a9dc76",
    failed: "#ff6188",
    focus: "#ffd866",
    kinds: { success: "#a9dc76", done: "#78dce8", failed: "#ff6188", complete: "#ffd866", data: "#ab9df2" },
  },
  light: {
    bg: "#ffffff",
    text: "#111827",
    mute: "#6b7280",
    title: "#111827",
    root: "#fdba74",
    up: "#a5f3fc",
    down: "#bbf7d0",
    failed: "#dc2626",
    focus: "#ca8a04",
    kinds: { success: "#16a34a", done: "#0891b2", failed: "#dc2626", complete: "#ca8a04", data: "#7c3aed" },
  },
} as const;

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Helvetica, Arial, sans-serif";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface LayoutNode {
  id: string;
  col: number;
  row: number;
  x: number;
  y: number;
  role: "root" | "up" | "down";
}

export interface LineageLayout {
  nodes: LayoutNode[];
  edges: LineageEdge[];
  width: number;
  height: number;
  truncatedUp: number;
  truncatedDown: number;
}

const NODE_W = 196;
const NODE_H = 30;
const GAP_X = 56;
const GAP_Y = 12;
const PAD = 16;
const HEADER = 40; // title + column headers

/**
 * Lay out the neighborhood of `root` up to `depth` in each direction. `maxPerColumn` caps very
 * wide columns (the rest are counted in truncatedUp/Down so the caller can say so).
 */
export function layoutLineage(
  g: LineageGraph,
  root: string,
  opts: { depth?: number; kinds?: Set<SignalKind>; maxPerColumn?: number } = {},
): LineageLayout {
  const depth = opts.depth ?? Infinity;
  const maxPer = opts.maxPerColumn ?? 18;
  const col = new Map<string, number>([[root, 0]]);
  const role = new Map<string, LayoutNode["role"]>([[root, "root"]]);
  for (const r of traverse(g, root, "up", depth, opts.kinds)) {
    col.set(r.dagId, -r.depth);
    role.set(r.dagId, "up");
  }
  for (const r of traverse(g, root, "down", depth, opts.kinds)) {
    if (col.has(r.dagId)) continue;
    col.set(r.dagId, r.depth);
    role.set(r.dagId, "down");
  }
  // group into columns, cap width
  const columns = new Map<number, string[]>();
  for (const [id, c] of col) columns.set(c, [...(columns.get(c) ?? []), id]);
  let truncatedUp = 0;
  let truncatedDown = 0;
  for (const [c, ids] of columns) {
    ids.sort();
    if (ids.length > maxPer) {
      const cut = ids.length - maxPer;
      if (c < 0) truncatedUp += cut;
      else truncatedDown += cut;
      ids.splice(maxPer);
    }
  }
  const kept = new Set([...columns.values()].flat());
  const edges = g.edges.filter(
    (e) => kept.has(e.from) && kept.has(e.to) && (!opts.kinds || opts.kinds.has(e.kind)) && e.from !== e.to,
  );
  // barycenter sweeps
  const cols = [...columns.keys()].sort((a, b) => a - b);
  const pos = new Map<string, number>();
  const reindex = () => cols.forEach((c) => (columns.get(c) ?? []).forEach((id, i) => pos.set(id, i)));
  reindex();
  const neighbors = (id: string, side: "left" | "right") =>
    edges
      .filter((e) => (side === "left" ? e.to === id : e.from === id))
      .map((e) => (side === "left" ? e.from : e.to))
      .filter((n) => pos.has(n));
  for (let sweep = 0; sweep < 4; sweep++) {
    const order = sweep % 2 === 0 ? cols : [...cols].reverse();
    for (const c of order) {
      const side = sweep % 2 === 0 ? "left" : "right";
      const ids = columns.get(c) ?? [];
      const bc = new Map(
        ids.map((id) => {
          const ns = neighbors(id, side);
          return [id, ns.length ? ns.reduce((s, n) => s + (pos.get(n) ?? 0), 0) / ns.length : (pos.get(id) ?? 0)];
        }),
      );
      ids.sort((a, b) => (bc.get(a) ?? 0) - (bc.get(b) ?? 0) || a.localeCompare(b));
      ids.forEach((id, i) => pos.set(id, i));
    }
  }
  const maxRows = Math.max(...cols.map((c) => (columns.get(c) ?? []).length));
  const fullH = maxRows * (NODE_H + GAP_Y) - GAP_Y;
  const nodes: LayoutNode[] = [];
  cols.forEach((c, ci) => {
    const ids = columns.get(c) ?? [];
    const colH = ids.length * (NODE_H + GAP_Y) - GAP_Y;
    const offset = (fullH - colH) / 2;
    ids.forEach((id, row) =>
      nodes.push({
        id,
        col: c,
        row,
        x: PAD + ci * (NODE_W + GAP_X),
        y: PAD + HEADER + 6 + offset + row * (NODE_H + GAP_Y),
        role: role.get(id) ?? "down",
      }),
    );
  });
  return {
    nodes,
    edges,
    width: PAD * 2 + cols.length * NODE_W + (cols.length - 1) * GAP_X,
    height: PAD * 2 + HEADER + 6 + fullH + 30,
    truncatedUp,
    truncatedDown,
  };
}

/** Keep both ends of long DAG ids (the distinguishing part is often the suffix). */
export function middleTruncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const head = Math.ceil((max - 1) * 0.45);
  const tail = max - 1 - head;
  return `${s.slice(0, head)}…${s.slice(s.length - tail)}`;
}

/** Render a layout to SVG. `failed` = DAG ids with recent failures; `focus` = highlighted node. */
export function lineageSvg(
  layout: LineageLayout,
  opts: { theme: Theme; failed?: Set<string>; focus?: string; title?: string },
): string {
  const p = PALETTE[opts.theme];
  const byId = new Map(layout.nodes.map((n) => [n.id, n]));
  // extra right margin so same-column arcs on the last column are not clipped
  const W = Math.max(layout.width + 70, 420);
  const H = layout.height;
  let body = "";
  if (opts.title)
    body += `<text x="${PAD}" y="${PAD + 12}" font-size="13" font-weight="600" fill="${p.title}">${esc(
      opts.title,
    )}</text>`;
  // column headers
  const colsSeen = new Map<number, number>();
  layout.nodes.forEach((n) => colsSeen.set(n.col, n.x));
  for (const [c, x] of colsSeen) {
    const label = c === 0 ? "DAG" : c < 0 ? `upstream ${-c}` : `downstream ${c}`;
    body += `<text x="${x + NODE_W / 2}" y="${PAD + HEADER - 6}" font-size="10" text-anchor="middle" fill="${
      p.mute
    }">${label}</text>`;
  }
  // edges first (under nodes)
  for (const e of layout.edges) {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) continue;
    const color = p.kinds[e.kind];
    const x1 = a.x + NODE_W;
    const y1 = a.y + NODE_H / 2;
    const x2 = b.x;
    const y2 = b.y + NODE_H / 2;
    if (a.col === b.col) {
      // same column (e.g. two depth-1 upstreams feeding each other): arc beside the column
      const xr = a.x + NODE_W;
      const bulge = 22 + Math.min(40, Math.abs(b.row - a.row) * 6);
      body += `<path d="M${xr},${y1} C${xr + bulge},${y1} ${
        xr + bulge
      },${y2} ${xr},${y2}" fill="none" stroke="${color}" stroke-width="1.3" opacity="0.55" stroke-dasharray="4 3"/>`;
      body += `<polygon points="${xr},${y2} ${xr + 7},${y2 - 4} ${xr + 7},${y2 + 4}" fill="${color}" opacity="0.7"/>`;
      continue;
    }
    const forward = x2 > x1;
    const dx = forward ? Math.max(30, (x2 - x1) / 2) : 60;
    const path = forward
      ? `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`
      : `M${x1},${y1} C${x1 + dx},${y1 + 50} ${x2 - dx},${y2 + 50} ${x2},${y2}`;
    body += `<path d="${path}" fill="none" stroke="${color}" stroke-width="1.6" opacity="0.85"/>`;
    body += `<polygon points="${x2},${y2} ${x2 - 7},${y2 - 4} ${x2 - 7},${y2 + 4}" fill="${color}"/>`;
  }
  // nodes
  for (const n of layout.nodes) {
    const fill = n.role === "root" ? p.root : n.role === "up" ? p.up : p.down;
    const isFailed = opts.failed?.has(n.id);
    const isFocus = opts.focus === n.id;
    const stroke = isFocus ? p.focus : isFailed ? p.failed : "none";
    const sw = isFocus ? 3 : isFailed ? 2.5 : 0;
    const label = middleTruncate(n.id, 29);
    body += `<rect x="${n.x}" y="${n.y}" width="${NODE_W}" height="${NODE_H}" rx="7" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    body += `<text x="${n.x + 10}" y="${n.y + NODE_H / 2 + 4}" font-size="11" font-weight="${
      n.role === "root" ? 700 : 500
    }" fill="${p.text}">${esc(label)}</text>`;
    if (isFailed) body += `<circle cx="${n.x + NODE_W - 10}" cy="${n.y + NODE_H / 2}" r="5" fill="${p.failed}"/>`;
  }
  // legend
  const kinds = Array.from(new Set(layout.edges.map((e) => e.kind)));
  let lx = PAD;
  const ly = H - 12;
  for (const k of kinds) {
    body += `<line x1="${lx}" x2="${lx + 18}" y1="${ly - 4}" y2="${ly - 4}" stroke="${
      p.kinds[k]
    }" stroke-width="2.5"/>`;
    body += `<text x="${lx + 24}" y="${ly}" font-size="10" fill="${p.mute}">${esc(KIND_LABEL[k])}</text>`;
    lx += 24 + KIND_LABEL[k].length * 6 + 18;
  }
  if (opts.failed?.size) {
    body += `<circle cx="${lx + 5}" cy="${ly - 4}" r="5" fill="${p.failed}"/><text x="${
      lx + 15
    }" y="${ly}" font-size="10" fill="${p.mute}">failed recently</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">${body}</svg>`;
}
