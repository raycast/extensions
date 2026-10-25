import { Model, Result, Section, Material } from "./types";
export type ReferenceKind = "point" | "moment" | "udl" | "thermal";
export interface ReferenceCase {
  id: string;
  title: string;
  group: string;
  kind: ReferenceKind;
  spans: number;
  support: "simple" | "cantilever" | "fixed" | "propped" | "guided";
  pattern?: string;
  envelope?: boolean;
  points?: number[];
  pointCount?: number;
  variable?: boolean;
  distribution?: "uniform" | "tent" | "triangle";
  source: string;
}
const source =
  "User-supplied beam reference photographs, pages 303–315; coefficients independently re-derived by equilibrium and integration of M/EI.";
export const referenceCases: ReferenceCase[] = [];
function add(
  support: ReferenceCase["support"],
  title: string,
  kind: ReferenceKind,
  extra: Partial<ReferenceCase> = {},
) {
  referenceCases.push({
    id: support + "-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title,
    group: {
      simple: "Simply supported",
      cantilever: "Cantilever",
      fixed: "Fixed ends",
      propped: "Propped cantilever",
      guided: "Guided end",
    }[support],
    kind,
    spans: 1,
    support,
    source,
    ...extra,
  });
}
for (const support of ["cantilever", "simple", "propped", "fixed"] as const) {
  add(support, "Point at centre", "point", { points: [0.5] });
  add(support, "Point at a", "point", { variable: true });
  add(support, "End moment", "moment", { points: [1] });
  if (support !== "cantilever") add(support, "Moment at a", "moment", { variable: true });
  add(support, "Uniform load", "udl", { distribution: "uniform" });
  if (support !== "cantilever") add(support, "Tent load", "udl", { distribution: "tent" });
  add(support, "Triangular load", "udl", { distribution: "triangle" });
}
add("cantilever", "Tip point force", "point", { points: [1] });
add("cantilever", "Two point forces", "point", { points: [0.5, 1] });
for (const support of ["simple", "propped", "fixed"] as const)
  for (let n = 2; n <= 5; n++) add(support, `${n} equal point forces`, "point", { pointCount: n });
for (const [title, kind, extra] of [
  ["Tip point force", "point", { points: [1] }],
  ["Centre point force", "point", { points: [0.5] }],
  ["Uniform load", "udl", { distribution: "uniform" }],
  ["Tent load", "udl", { distribution: "tent" }],
  ["Triangular load", "udl", { distribution: "triangle" }],
] as const)
  add("guided", title, kind, {
    ...extra,
    points: "points" in extra ? [...extra.points] : undefined,
  });
for (let spans = 2; spans <= 7; spans++)
  add("simple", `${spans} spans / UDL`, "udl", {
    id: `continuous-${spans}-udl`,
    spans,
    group: "Continuous spans",
    distribution: "uniform",
  });
for (let spans = 2; spans <= 4; spans++)
  for (let count = 1; count <= 4; count++)
    add("simple", `${spans} spans / ${count} points each`, "point", {
      id: `continuous-${spans}-points-${count}`,
      spans,
      pointCount: count,
      group: "Continuous point loads",
    });
for (let spans = 2; spans <= 4; spans++)
  for (let mask = 1; mask < (1 << spans) - 1; mask++) {
    const pattern = Array.from({ length: spans }, (_, i) => (mask & (1 << i) ? "1" : "0")).join("");
    add("simple", `${spans} spans / ${pattern}`, "udl", {
      id: `pattern-${pattern}`,
      spans,
      pattern,
      group: "Pattern loading",
      distribution: "uniform",
    });
  }
for (const support of ["cantilever", "simple", "propped", "fixed"] as const)
  add(
    support,
    {
      cantilever: "Cantilever",
      simple: "Simply supported",
      propped: "Propped cantilever",
      fixed: "Fixed ends",
    }[support],
    "thermal",
    {
      group: "Temperature gradient",
      id: `thermal-${support}`,
    },
  );
for (let spans = 2; spans <= 4; spans++)
  add("simple", `${spans}-span envelope`, "udl", {
    id: `envelope-${spans}`,
    group: "Pattern envelopes",
    spans,
    envelope: true,
    distribution: "uniform",
  });
export interface RefInput {
  L: number;
  P: number;
  q: number;
  M: number;
  E: number;
  I: number;
  a: number;
  alpha: number;
  dT: number;
  h: number;
  G?: number;
  As?: number;
}
interface Applied {
  points: { x: number; p: number }[];
  moments: { x: number; m: number }[];
  lines: { a: number; b: number; q0: number; q1: number }[];
}
export function referenceLoads(c: ReferenceCase, ratio = 1 / 3): Applied {
  const points: Applied["points"] = [],
    moments: Applied["moments"] = [],
    lines: Applied["lines"] = [];
  const positions = c.variable
    ? [ratio]
    : c.points || Array.from({ length: c.pointCount || 1 }, (_, i) => (i + 1) / ((c.pointCount || 1) + 1));
  for (let span = 0; span < c.spans; span++) {
    if (c.pattern && c.pattern[span] !== "1") continue;
    if (c.kind === "point") for (const x of positions) points.push({ x: span + x, p: 1 });
    if (c.kind === "moment") for (const x of positions) moments.push({ x: span + x, m: 1 });
    if (c.kind === "udl") {
      if (c.distribution === "tent")
        lines.push({ a: span, b: span + 0.5, q0: 0, q1: 1 }, { a: span + 0.5, b: span + 1, q0: 1, q1: 0 });
      else
        lines.push({
          a: span,
          b: span + 1,
          q0: 1,
          q1: c.distribution === "triangle" ? 0 : 1,
        });
    }
  }
  return { points, moments, lines };
}
export function refSupports(c: ReferenceCase) {
  return Array.from({ length: c.spans + 1 }, (_, i) => ({
    x: i,
    vertical: c.support === "cantilever" ? i === 0 : c.support === "guided" ? i === 0 : true,
    fixed:
      c.support === "fixed" ||
      c.support === "guided" ||
      ((c.support === "cantilever" || c.support === "propped") && i === 0),
  }));
}
/** Independent force/compatibility method: no element stiffness matrices and no production solver. */
const solutionCache = new Map<string, ReturnType<typeof solveReference>>();
export function referenceSolution(c: ReferenceCase, ratio = 1 / 3, beta = 0) {
  const key = c.id + ":" + ratio + ":" + beta;
  const found = solutionCache.get(key);
  if (found) return found;
  const value = solveReference(c, ratio, beta);
  if (solutionCache.size > 400) solutionCache.clear();
  solutionCache.set(key, value);
  return value;
}
function solveReference(c: ReferenceCase, ratio = 1 / 3, beta = 0) {
  if (!(ratio >= 0 && ratio <= 1)) throw Error("Point position must lie within each span");
  const loads = referenceLoads(c, ratio),
    supports = refSupports(c),
    unknowns = supports.flatMap((s) => [
      ...(s.vertical ? [{ x: s.x, type: "force" }] : []),
      ...(s.fixed ? [{ x: s.x, type: "moment" }] : []),
    ]);
  const n = unknowns.length + 2,
    total = c.spans,
    kappa = c.kind === "thermal" ? -1 : 0;
  const bracket = (x: number, a: number, p: number) => (p === 0 ? Number(x >= a) : Math.max(0, x - a) ** p);
  function loadIntegral(x: number, order: number) {
    const fac = [1, 1, 2, 6, 24, 120];
    let v = 0;
    for (const l of loads.points) v -= (l.p * bracket(x, l.x, order + 1)) / fac[order + 1];
    for (const l of loads.moments) v -= (l.m * bracket(x, l.x, order)) / fac[order];
    for (const l of loads.lines) {
      const slope = (l.q1 - l.q0) / (l.b - l.a);
      v -= (l.q0 * bracket(x, l.a, order + 2)) / fac[order + 2] + (slope * bracket(x, l.a, order + 3)) / fac[order + 3];
      v += (l.q1 * bracket(x, l.b, order + 2)) / fac[order + 2] + (slope * bracket(x, l.b, order + 3)) / fac[order + 3];
    }
    return v;
  }
  const factor = [1, 1, 2, 6];
  const row = (x: number, order: number) => [
    ...unknowns.map((u) =>
      u.type === "force"
        ? bracket(x, u.x, order + 1) / factor[order + 1] - (order === 2 ? beta * bracket(x, u.x, 1) : 0)
        : -bracket(x, u.x, order) / factor[order],
    ),
    ...(order === 2 ? [x, 1] : order === 1 ? [1, 0] : [0, 0]),
  ];
  const known = (x: number, order: number) =>
    loadIntegral(x, order) +
    (order === 2
      ? (kappa * x * x) / 2 -
        beta * (loadIntegral(x, 0) + loads.moments.reduce((sum, l) => sum + l.m * bracket(x, l.x, 0), 0))
      : order === 1
        ? kappa * x
        : 0);
  const A: number[][] = [],
    b: number[] = [];
  const W =
    loads.points.reduce((s, l) => s + l.p, 0) + loads.lines.reduce((s, l) => s + ((l.q0 + l.q1) * (l.b - l.a)) / 2, 0);
  const WM =
    loads.points.reduce((s, l) => s + l.p * l.x, 0) +
    loads.lines.reduce((s, l) => s + ((l.b - l.a) * (l.q0 * (2 * l.a + l.b) + l.q1 * (l.a + 2 * l.b))) / 6, 0) -
    loads.moments.reduce((s, l) => s + l.m, 0);
  A.push([...unknowns.map((u) => Number(u.type === "force")), 0, 0]);
  b.push(W);
  A.push([...unknowns.map((u) => (u.type === "force" ? u.x : 1)), 0, 0]);
  b.push(WM);
  for (const s of supports) {
    if (s.vertical) {
      A.push(row(s.x, 2));
      b.push(-known(s.x, 2));
    }
    if (s.fixed) {
      A.push(row(s.x, 1));
      b.push(-known(s.x, 1));
    }
  }
  if (A.length !== n) throw Error("Compatibility equation count mismatch");
  // Small dimensionless systems with independent partial-pivot elimination.
  for (let j = 0; j < n; j++) {
    let pivot = j;
    for (let i = j + 1; i < n; i++) if (Math.abs(A[i][j]) > Math.abs(A[pivot][j])) pivot = i;
    [A[j], A[pivot]] = [A[pivot], A[j]];
    [b[j], b[pivot]] = [b[pivot], b[j]];
    if (Math.abs(A[j][j]) < 1e-12) throw Error("Reference system is a mechanism");
    const v = A[j][j];
    for (let k = j; k < n; k++) A[j][k] /= v;
    b[j] /= v;
    for (let i = 0; i < n; i++)
      if (i !== j) {
        const f = A[i][j];
        for (let k = j; k < n; k++) A[i][k] -= f * A[j][k];
        b[i] -= f * b[j];
      }
  }
  function value(x: number, order: number) {
    return row(x, order).reduce((s, v, i) => s + v * b[i], 0) + known(x, order);
  }
  const shear = (x: number) => {
    let V =
      unknowns.reduce((v, u, i) => v + (u.type === "force" && x >= u.x ? b[i] : 0), 0) -
      loads.points.reduce((v, l) => v + (x >= l.x ? l.p : 0), 0);
    for (const l of loads.lines) {
      const slope = (l.q1 - l.q0) / (l.b - l.a);
      V -= l.q0 * bracket(x, l.a, 1) + (slope * bracket(x, l.a, 2)) / 2;
      V += l.q1 * bracket(x, l.b, 1) + (slope * bracket(x, l.b, 2)) / 2;
    }
    return V;
  };
  const cuts = [
    ...new Set([
      0,
      total,
      ...loads.points.map((l) => l.x),
      ...loads.moments.map((l) => l.x),
      ...loads.lines.flatMap((l) => [l.a, l.b]),
      ...supports.map((s) => s.x),
    ]),
  ].sort((a, b) => a - b);
  const candidates = new Set(cuts);
  for (let i = 1; i < cuts.length; i++) {
    const lo = cuts[i - 1],
      hi = cuts[i];
    for (let j = 1; j <= 60; j++) {
      const a = lo + ((hi - lo) * (j - 1)) / 60,
        d = lo + ((hi - lo) * j) / 60;
      candidates.add(d);
      for (const order of [0, 1]) {
        const fun = (x: number) => (order === 0 ? shear(x) : value(x, 1) - beta * shear(x));
        if (fun(a + 1e-10) * fun(d - 1e-10) < 0) {
          let left = a,
            right = d;
          for (let k = 0; k < 45; k++) {
            const mid = (left + right) / 2;
            if (fun(left + 1e-12) * fun(mid) <= 0) right = mid;
            else left = mid;
          }
          candidates.add((left + right) / 2);
        }
      }
    }
  }
  const samples = [...candidates].flatMap((x) => [Math.max(0, x - 1e-9), Math.min(total, x + 1e-9)]);
  const peak = (order: number) =>
    samples
      .map((x) => ({ x, value: value(x, order) }))
      .reduce((a, b) => (Math.abs(a.value) > Math.abs(b.value) ? a : b));
  return {
    loads,
    supports,
    reactions: unknowns.map((u, i) => ({ ...u, value: b[i] })),
    shear,
    at: (x: number) => ({
      M: value(x === total ? x - 1e-10 : x, 0),
      rotation: value(x, 1),
      v: value(x, 2),
    }),
    maxPositiveMoment: Math.max(0, ...samples.map((x) => value(x, 0))),
    minNegativeMoment: Math.min(0, ...samples.map((x) => value(x, 0))),
    peakM: peak(0),
    peakV: samples
      .map((x) => ({ x, value: shear(x) }))
      .reduce((a, b) => (Math.abs(a.value) > Math.abs(b.value) ? a : b)),
    peakVb: peak(2),
  };
}
export function referenceModel(c: ReferenceCase, v: RefInput, section: Section, material: Material): Model {
  if (!(v.L > 0 && v.E > 0 && v.I > 0)) throw Error("Enter positive span, E and I");
  const nodes = refSupports(c).map((s, i) => ({
    id: String.fromCharCode(65 + i),
    x: s.x * v.L,
    z: 0,
    restraints: [i === 0, s.vertical, s.fixed] as [boolean, boolean, boolean],
  }));
  const members = Array.from({ length: c.spans }, (_, i) => ({
    id: "M" + (i + 1),
    start: nodes[i].id,
    end: nodes[i + 1].id,
    type: "frame" as const,
    E: v.E,
    G: v.G ?? material.G ?? undefined,
    A: section.A,
    I: v.I,
    section,
    bendingAxis: "y" as const,
  }));
  const model: Model = {
    nodes,
    members,
    memberLoads: [],
    nodalLoads: [],
    theory: "euler",
  };
  const loads = referenceLoads(c, v.a / v.L);
  const locate = (x: number) => {
    const span = Math.min(c.spans - 1, Math.floor(x));
    return { member: members[span].id, position: (x - span) * v.L };
  };
  for (const l of loads.points)
    model.memberLoads.push({
      ...locate(l.x),
      kind: "point",
      magnitude: -v.P,
      direction: "globalZ",
      basis: "member",
    });
  for (const l of loads.moments)
    model.memberLoads.push({
      ...locate(l.x),
      kind: "moment",
      magnitude: v.M,
      direction: "globalZ",
      basis: "member",
    });
  for (const l of loads.lines) {
    const span = Math.min(c.spans - 1, Math.floor(l.a));
    model.memberLoads.push({
      member: members[span].id,
      kind: "udl",
      magnitude: -v.q * l.q0,
      endMagnitude: -v.q * l.q1,
      start: (l.a - span) * v.L,
      end: (l.b - span) * v.L,
      direction: "globalZ",
      basis: "member",
    });
  }
  return model;
}
export function referenceScales(c: ReferenceCase, v: RefInput) {
  const F =
    c.kind === "point"
      ? v.P
      : c.kind === "udl"
        ? v.q * v.L
        : c.kind === "moment"
          ? v.M / v.L
          : (v.E * v.I * v.alpha * v.dT) / (v.h * v.L);
  return {
    force: F,
    moment: F * v.L,
    deflection: (F * v.L ** 3) / (v.E * v.I),
    rotation: (F * v.L ** 2) / (v.E * v.I),
  };
}
export function referenceResult(c: ReferenceCase, v: RefInput, model: Model): Result {
  const s = referenceSolution(c, v.a / v.L),
    k = referenceScales(c, v);
  const reactions: Record<string, number[]> = {},
    displacements: Record<string, number[]> = {};
  model.nodes.forEach((n, i) => {
    reactions[n.id] = [0, 0, 0];
    displacements[n.id] = [0, s.at(i).v * k.deflection, s.at(i).rotation * k.rotation];
  });
  for (const r of s.reactions)
    reactions[String.fromCharCode(65 + r.x)][r.type === "force" ? 1 : 2] +=
      r.value * (r.type === "force" ? k.force : k.moment);
  return {
    reactions,
    displacements,
    residual: 0,
    warnings: [],
    totals: { fx: 0, fz: 0, moment: 0 },
    members: model.members.map((m, i) => ({
      id: m.id,
      length: v.L,
      angle: 0,
      endForces: [],
      stations: Array.from({ length: 101 }, (_, j) => {
        const x = i + j / 100,
          d = s.at(x),
          eps = 1e-7,
          V = s.shear(j === 100 ? x - eps : x + eps);
        return {
          x: (j * v.L) / 100,
          N: 0,
          V: V * k.force,
          M: d.M * k.moment,
          u: 0,
          v: d.v * k.deflection,
          globalX: 0,
          globalZ: d.v * k.deflection,
          rotation: d.rotation * k.rotation,
        };
      }),
    })),
  };
}

/** Exhaustive full/empty-span patterns; extrema are explicitly non-concurrent. */
export function referenceEnvelope(c: ReferenceCase, beta = 0) {
  const cases = Array.from({ length: (1 << c.spans) - 1 }, (_, i) => {
    const mask = i + 1,
      pattern = Array.from({ length: c.spans }, (_, j) => (mask & (1 << j) ? "1" : "0")).join("");
    const item = {
      ...c,
      id: `envelope-case-${pattern}`,
      pattern,
      envelope: false,
    };
    return { c: item, s: referenceSolution(item, 1 / 3, beta) };
  });
  const critical = cases.reduce((a, b) => (Math.abs(a.s.peakVb.value) > Math.abs(b.s.peakVb.value) ? a : b));
  return {
    criticalCase: critical.c,
    patterns: cases.length,
    positive: Math.max(...cases.map((p) => p.s.maxPositiveMoment)),
    negative: Math.min(...cases.map((p) => p.s.minNegativeMoment)),
    shear: Math.max(...cases.map((p) => Math.abs(p.s.peakV.value))),
    deflection: Math.max(...cases.map((p) => Math.abs(p.s.peakVb.value))),
    reactions: Array.from({ length: c.spans + 1 }, (_, i) => {
      const forces = cases.map((p) => p.s.reactions.find((r) => r.type === "force" && r.x === i)?.value || 0);
      return {
        node: String.fromCharCode(65 + i),
        max: Math.max(...forces),
        min: Math.min(...forces),
      };
    }),
  };
}
