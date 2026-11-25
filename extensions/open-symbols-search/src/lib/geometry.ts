/**
 * Pure path geometry for Open Symbols templates. Template paths only use
 * absolute M, L, C and Z commands, which keeps parsing simple.
 */

export type Box = { x: number; y: number; w: number; h: number };

const TOKEN = /[MLCZmlcz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

type Cmd = { op: "M" | "L" | "C" | "Z"; pts: number[] };

export function parsePath(d: string): Cmd[] {
  const out: Cmd[] = [];
  let cur: Cmd | undefined;
  for (const t of d.match(TOKEN) ?? []) {
    if (/[a-z]/i.test(t)) {
      cur = { op: t.toUpperCase() as Cmd["op"], pts: [] };
      out.push(cur);
    } else if (cur) {
      // Implicit repeats ("M x y x y" or "C ... ...") stay in one command.
      cur.pts.push(parseFloat(t));
    }
  }
  return out;
}

/** Roots in (0,1) of the derivative of a 1-D cubic Bézier. */
function cubicExtrema(p0: number, p1: number, p2: number, p3: number): number[] {
  const a = -p0 + 3 * p1 - 3 * p2 + p3;
  const b = 2 * (p0 - 2 * p1 + p2);
  const c = p1 - p0;
  const ts: number[] = [];
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) > 1e-12) ts.push(-c / b);
  } else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const s = Math.sqrt(disc);
      ts.push((-b + s) / (2 * a), (-b - s) / (2 * a));
    }
  }
  return ts.filter((t) => t > 0 && t < 1);
}

function cubicAt(p0: number, p1: number, p2: number, p3: number, t: number) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

/** Exact bounding box of the filled shape (curve extrema, not control points). */
export function bbox(paths: string[]): Box | undefined {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const add = (x: number, y: number) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  };
  for (const d of paths) {
    let cx = 0,
      cy = 0;
    for (const { op, pts } of parsePath(d)) {
      if (op === "M" || op === "L") {
        for (let i = 0; i + 1 < pts.length; i += 2) {
          cx = pts[i];
          cy = pts[i + 1];
          add(cx, cy);
        }
      } else if (op === "C") {
        for (let i = 0; i + 5 < pts.length; i += 6) {
          const [x1, y1, x2, y2, x, y] = pts.slice(i, i + 6);
          add(x, y);
          for (const t of cubicExtrema(cx, x1, x2, x)) add(cubicAt(cx, x1, x2, x, t), cubicAt(cy, y1, y2, y, t));
          for (const t of cubicExtrema(cy, y1, y2, y)) add(cubicAt(cx, x1, x2, x, t), cubicAt(cy, y1, y2, y, t));
          cx = x;
          cy = y;
        }
      }
    }
  }
  if (!isFinite(minX)) return undefined;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/**
 * Open Symbols places every glyph on the same grid: vertically centered on
 * half the cap height, with the original icon canvas spanning roughly
 * 1.42 × cap height. A fixed square frame therefore reproduces each library's
 * own canvas and keeps icons at a consistent optical size.
 */
export function squareFrame(glyphBox: Box | undefined, capHeight: number): Box {
  const side0 = capHeight * 1.42;
  const cx = glyphBox ? glyphBox.x + glyphBox.w / 2 : side0 / 2;
  const cy = -capHeight / 2;
  let side = side0;
  if (glyphBox) {
    // Grow (rarely needed) so the glyph always fits inside the frame.
    side = Math.max(
      side,
      2 * Math.max(cx - glyphBox.x, glyphBox.x + glyphBox.w - cx) * 1.04,
      2 * Math.max(cy - glyphBox.y, glyphBox.y + glyphBox.h - cy) * 1.04,
    );
  }
  return { x: cx - side / 2, y: cy - side / 2, w: side, h: side };
}

const fmt = (n: number) => {
  const v = Math.round(n * 1000) / 1000;
  return Object.is(v, -0) ? "0" : String(v);
};

/** Rewrites paths into a frame-relative coordinate space scaled by `k`. */
export function transformPaths(paths: string[], frame: Box, k: number): string[] {
  return paths.map((d) =>
    parsePath(d)
      .map(({ op, pts }) => {
        const mapped = pts.map((n, i) => fmt((i % 2 === 0 ? n - frame.x : n - frame.y) * k));
        return op + mapped.join(" ");
      })
      .join(""),
  );
}

/** Same as transformPaths but emits PDF operators, with the y axis flipped. */
export function pathsToPdfOps(paths: string[], frame: Box, k: number, pageHeight: number): string {
  const ops: string[] = [];
  const X = (n: number) => fmt((n - frame.x) * k);
  const Y = (n: number) => fmt(pageHeight - (n - frame.y) * k);
  for (const d of paths) {
    for (const { op, pts } of parsePath(d)) {
      if (op === "M") ops.push(`${X(pts[0])} ${Y(pts[1])} m`);
      if (op === "M" || op === "L") {
        for (let i = op === "M" ? 2 : 0; i + 1 < pts.length; i += 2) ops.push(`${X(pts[i])} ${Y(pts[i + 1])} l`);
      } else if (op === "C") {
        for (let i = 0; i + 5 < pts.length; i += 6) {
          ops.push(
            `${X(pts[i])} ${Y(pts[i + 1])} ${X(pts[i + 2])} ${Y(pts[i + 3])} ${X(pts[i + 4])} ${Y(pts[i + 5])} c`,
          );
        }
      } else if (op === "Z") {
        ops.push("h");
      }
    }
    // Fill each <path> separately with the non-zero rule, matching SVG's default.
    ops.push("f");
  }
  return ops.join("\n");
}
