import { Node, RelOp, conjuncts, containsVar, disjuncts, joinWith, walk } from "./ast";
import {
  ANGLE_FACTOR,
  AngleMode,
  DimConstraint,
  Env,
  EvalError,
  UndefinedVar,
  Value,
  evaluate,
  lookupVar,
  q,
  setSolveHook,
} from "./evaluate";
import { unitNodeForDim, withUnit } from "./format";
import { Algebra, Frac, fracOf, isZeroFrac, isolate } from "./symbolic";
import * as N from "./num";
import { Num } from "./num";
import { BASE_COUNT, Dim, lookupNspire } from "./units";

type Call = Extract<Node, { type: "call" }>;

/** A real root: its float value and the node used to display it (exact when possible). */
interface Root {
  v: number;
  node: Node;
}

const MAX_SHOWN = 10;

// ---------------------------------------------------------------- helpers

const numNode = (x: Num): Node => ({ type: "num", value: x });
const floatRoot = (v: number): Root => ({ v, node: numNode(N.fl(v)) });

function isqrtParts(n: bigint): [bigint, bigint] {
  // n = k^2 * m with m squarefree (best effort for large n)
  if (n < 0n) throw new Error("negative");
  let k = 1n,
    m = n;
  for (let p = 2n; p * p <= m && p < 1000000n; p++) {
    const pp = p * p;
    while (m % pp === 0n) {
      m /= pp;
      k *= p;
    }
  }
  return [k, m];
}

/** (a + b√m) / d as a node. */
function surdNode(a: bigint, b: bigint, m: bigint, d: bigint): Node {
  if (d < 0n) {
    a = -a;
    b = -b;
    d = -d;
  }
  const g = N.bgcd(N.bgcd(a, b), d);
  if (g > 1n) {
    a /= g;
    b /= g;
    d /= g;
  }
  const absB = b < 0n ? -b : b;
  const sq: Node = { type: "call", name: "sqrt", args: [numNode(N.rat(m))] };
  const term: Node = absB === 1n ? sq : { type: "mul", l: numNode(N.rat(absB)), r: sq };
  let numer: Node;
  if (a === 0n) numer = b < 0n ? { type: "neg", arg: term } : term;
  else numer = b < 0n ? { type: "sub", l: numNode(N.rat(a)), r: term } : { type: "add", l: numNode(N.rat(a)), r: term };
  if (d === 1n) return numer;
  if (a === 0n && b < 0n) return { type: "neg", arg: { type: "div", l: term, r: numNode(N.rat(d)) } };
  return { type: "div", l: numer, r: numNode(N.rat(d)) };
}

/** ±√(r) for a positive rational r, simplified. */
function sqrtRational(r: Num, negative: boolean): Root {
  if (!r.e) throw new Error("exact expected");
  const [k, m] = isqrtParts(r.n * r.d);
  const v = Math.sqrt(N.toF(r)) * (negative ? -1 : 1);
  if (m === 1n) {
    const val = N.rat(negative ? -k : k, r.d);
    return { v, node: numNode(val) };
  }
  return { v, node: surdNode(0n, negative ? -k : k, m, r.d) };
}

/** Recognizes a float as a simple exact number: p/q, p/q·π or ±√(p/q). */
export function recognize(v: number): Node | null {
  // Beyond 2^53 a float no longer pins down an exact form.
  if (!Number.isFinite(v) || Math.abs(v) > 2 ** 53) return null;
  if (Math.abs(v) < 1e-13) return numNode(N.ZERO);
  const r = N.toRat(v, 1000, 1e-10);
  if (r) return numNode(r);
  const rp = N.toRat(v / Math.PI, 24, 1e-10);
  if (rp && rp.e) {
    const absN = rp.n < 0n ? -rp.n : rp.n;
    let node: Node =
      absN === 1n
        ? { type: "const", name: "π" }
        : { type: "mul", l: numNode(N.rat(absN)), r: { type: "const", name: "π" } };
    if (rp.d !== 1n) node = { type: "div", l: node, r: numNode(N.rat(rp.d)) };
    return rp.n < 0n ? { type: "neg", arg: node } : node;
  }
  // k/π, e.g. 180/π from degree-mode inverse trig derivatives.
  const ip = N.toRat(v * Math.PI, 24, 1e-10);
  if (ip && ip.e && ip.d === 1n) {
    const node: Node = { type: "div", l: numNode(N.rat(ip.n < 0n ? -ip.n : ip.n)), r: { type: "const", name: "π" } };
    return ip.n < 0n ? { type: "neg", arg: node } : node;
  }
  const r2 = N.toRat(v * v, 1000, 1e-10);
  if (r2 && r2.e && r2.n > 0n) return sqrtRational(r2, v < 0).node;
  const r3 = N.toRat(v * v * v, 1000, 1e-10);
  if (r3 && r3.e) {
    const neg = r3.n < 0n;
    const node: Node = { type: "call", name: "root", args: [numNode(neg ? N.neg(r3) : r3), numNode(N.int(3))] };
    return neg ? { type: "neg", arg: node } : node;
  }
  const re = N.toRat(Math.exp(v), 100, 1e-10);
  if (re && re.e && re.n > 0n && !(re.n === 1n && re.d === 1n))
    return { type: "call", name: "ln", args: [numNode(re)] };
  return null;
}

function rootsFromFloats(vs: number[], exact: boolean): Root[] {
  return vs.map((v) => {
    const node = exact ? recognize(v) : null;
    return node ? { v, node } : floatRoot(v);
  });
}

function dedupeSorted(vs: number[], tol = 1e-9): number[] {
  const s = [...vs].sort((a, b) => a - b);
  const out: number[] = [];
  for (const x of s) {
    const last = out[out.length - 1];
    if (out.length && Math.abs(x - last) <= tol * Math.max(1e-300, Math.abs(x), Math.abs(last))) continue;
    out.push(x);
  }
  return out;
}

// ---------------------------------------------------------------- user functions

function substitute(n: Node, map: Map<string, Node>): Node {
  switch (n.type) {
    case "var":
      return map.get(n.name) ?? n;
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "pow":
    case "rel":
    case "and":
    case "or":
    case "convert":
    case "with":
      return { ...n, l: substitute(n.l, map), r: substitute(n.r, map) } as Node;
    case "neg":
    case "fact":
    case "pct":
    case "not":
      return { ...n, arg: substitute(n.arg, map) } as Node;
    case "call":
      return { ...n, args: n.args.map((a) => substitute(a, map)) };
    case "list":
      return { ...n, items: n.items.map((a) => substitute(a, map)) };
    default:
      return n;
  }
}

/** Inlines user-defined functions so polynomial detection can see through them. */
export function expandFuncs(n: Node, env: Env, depth = 0): Node {
  if (depth > 32) return n;
  const rec = (x: Node) => expandFuncs(x, env, depth + 1);
  if (n.type === "call") {
    const args = n.args.map(rec);
    const uf = env.funcs.get(n.name);
    if (uf && uf.params.length === args.length) {
      const map = new Map(uf.params.map((p, i) => [p, args[i]] as [string, Node]));
      return rec(substitute(uf.body, map));
    }
    return { ...n, args };
  }
  return mapChildren(n, rec);
}

function mapChildren(n: Node, f: (x: Node) => Node): Node {
  switch (n.type) {
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "pow":
    case "rel":
    case "and":
    case "or":
    case "convert":
    case "with":
      return { ...n, l: f(n.l), r: f(n.r) } as Node;
    case "neg":
    case "fact":
    case "pct":
    case "not":
      return { ...n, arg: f(n.arg) } as Node;
    case "list":
      return { ...n, items: n.items.map(f) };
    case "call":
      return { ...n, args: n.args.map(f) };
    default:
      return n;
  }
}

// ---------------------------------------------------------------- free variables

const RESERVED = new Set(["e", "i", "true", "false", "undef"]);
/** Functions whose second argument is a bound (dummy) variable. */
const BINDING_FUNCS = new Set(["d", "nderiv", "nint", "integral", "seq", "fmin", "fmax", "sum", "product"]);

export function freeVars(n: Node, env: Env): string[] {
  const out: string[] = [];
  const bound = new Set<string>();
  const visit = (x: Node) => {
    if (x.type === "with") {
      for (const c of conjuncts(x.r)) if (c.type === "rel" && c.op === "=" && c.l.type === "var") bound.add(c.l.name);
      visit(x.l);
      // Substituted values can contain unknowns; conditions like x>0 only restrict solutions.
      for (const c of conjuncts(x.r)) if (c.type === "rel" && c.op === "=" && c.l.type === "var") visit(c.r);
      return;
    }
    if (x.type === "call" && ["solve", "csolve", "nsolve", "zeros"].includes(x.name)) return;
    if (x.type === "call" && BINDING_FUNCS.has(x.name) && x.args.length >= 2) {
      const v =
        x.args[1].type === "var"
          ? x.args[1].name
          : x.args[1].type === "rel" && x.args[1].l.type === "var"
            ? x.args[1].l.name
            : null;
      const inner = freeVars({ type: "list", items: [x.args[0], ...x.args.slice(2)] }, env).filter((n) => n !== v);
      if (x.args[1].type === "rel") inner.push(...freeVars(x.args[1].r, env));
      for (const n of inner) if (!out.includes(n) && !bound.has(n)) out.push(n);
      return;
    }
    if (x.type === "var") {
      if (!bound.has(x.name) && !RESERVED.has(x.name) && !lookupVar(x.name, env) && !out.includes(x.name))
        out.push(x.name);
      return;
    }
    if (x.type === "call") {
      const uf = env.funcs.get(x.name);
      x.args.forEach(visit);
      if (uf) {
        // Free variables used inside the function body (not its parameters).
        const inner = freeVars(uf.body, {
          ...env,
          locals: new Map(uf.params.map((p) => [p, q(N.ZERO)] as [string, Value])),
        });
        for (const v of inner) if (!out.includes(v)) out.push(v);
      }
      return;
    }
    mapChildren(x, (c) => {
      visit(c);
      return c;
    });
  };
  visit(n);
  return out;
}

// ---------------------------------------------------------------- dimension inference

function slotDim(i: number, n: number): Dim {
  const d = new Array(BASE_COUNT + n).fill(0);
  d[BASE_COUNT + i] = 1;
  return d;
}

/**
 * Finds the physical dimension of each unknown so that every sum and equation is
 * dimensionally consistent (e.g. x·2_s = 10_m ⇒ x is m/s).
 */
export function inferDims(gs: Node[], vars: string[], env: Env): Dim[] {
  const n = vars.length;
  const subst: (Dim | null)[] = vars.map(() => null);
  const dimOf = (i: number) => subst[i] ?? slotDim(i, n);
  for (let iter = 0; iter < 4 * n + 8; iter++) {
    try {
      const locals = new Map(env.locals ?? []);
      vars.forEach((v, i) => locals.set(v, q(N.fl(0.7316 + 0.1173 * i), dimOf(i))));
      const denv: Env = { ...env, locals, dimMode: true };
      for (const g of gs) evaluate(g, denv);
      break;
    } catch (e) {
      if (!(e instanceof DimConstraint)) {
        if (e instanceof UndefinedVar || (e instanceof EvalError && e.message.startsWith("Incompatible units")))
          throw e;
        break;
      }
      const diff = e.diff;
      let j = -1;
      for (let s = 0; s < n; s++) if (Math.abs(diff[BASE_COUNT + s] ?? 0) > 1e-9) j = s;
      if (j < 0) throw new EvalError("Incompatible units");
      const k = diff[BASE_COUNT + j];
      // diff = rest + k·X_j = 0  ⇒  X_j = -rest / k
      const rest = diff.map((x, idx) => (idx === BASE_COUNT + j ? 0 : x));
      const xj = rest.map((x) => clean(-x / k));
      while (xj.length < BASE_COUNT + n) xj.push(0);
      // Replace slot j everywhere it is still referenced.
      for (let i = 0; i < n; i++) {
        if (i === j) continue;
        const d = subst[i];
        if (!d) continue;
        const c = d[BASE_COUNT + j] ?? 0;
        if (Math.abs(c) < 1e-12) continue;
        subst[i] = d.map((x, idx) => clean((idx === BASE_COUNT + j ? 0 : x) + c * (xj[idx] ?? 0)));
      }
      subst[j] = xj;
    }
  }
  // Unconstrained slots are dimensionless.
  return vars.map((_, i) => dimOf(i).slice(0, BASE_COUNT).map(clean));
}

function clean(x: number): number {
  const r = Math.round(x * 1e9) / 1e9;
  return Object.is(r, -0) ? 0 : r;
}

// ---------------------------------------------------------------- polynomials

type Poly = Num[]; // index = degree

function pTrim(p: Poly): Poly {
  const r = [...p];
  while (r.length > 1 && N.isZero(r[r.length - 1])) r.pop();
  return r;
}
function pAdd(a: Poly, b: Poly): Poly {
  const r: Poly = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) r.push(N.add(a[i] ?? N.ZERO, b[i] ?? N.ZERO));
  return pTrim(r);
}
function pScale(a: Poly, k: Num): Poly {
  return pTrim(a.map((x) => N.mul(x, k)));
}
function pMul(a: Poly, b: Poly): Poly {
  const r: Poly = new Array(a.length + b.length - 1).fill(N.ZERO);
  a.forEach((x, i) => b.forEach((y, j) => (r[i + j] = N.add(r[i + j], N.mul(x, y)))));
  return pTrim(r);
}
function pEval(p: Poly, x: Num): Num {
  let acc = N.ZERO;
  for (let i = p.length - 1; i >= 0; i--) acc = N.add(N.mul(acc, x), p[i]);
  return acc;
}
function pEvalF(p: number[], x: number): number {
  let acc = 0;
  for (let i = p.length - 1; i >= 0; i--) acc = acc * x + p[i];
  return acc;
}
const deg = (p: Poly) => pTrim(p).length - 1;
const isZeroPoly = (p: Poly) => p.length === 1 && N.isZero(p[0]);

interface RatFn {
  n: Poly;
  d: Poly;
}

/** Writes g(x) as N(t)/D(t) where x = t·[unit]; null if g is not rational in x. */
function ratOf(g: Node, x: string, env: Env): RatFn | null {
  const names = new Set([x]);
  const constant = (node: Node): RatFn | null => {
    const v = evaluate(node, env);
    if (v.k !== "q") return null;
    return { n: [v.num], d: [N.ONE] };
  };
  const norm = (r: RatFn): RatFn | null => {
    if (deg(r.n) > 40 || deg(r.d) > 40) return null;
    if (deg(r.d) === 0) {
      if (N.isZero(r.d[0])) return null;
      return { n: pScale(r.n, N.div(N.ONE, r.d[0])), d: [N.ONE] };
    }
    return r;
  };
  const rec = (node: Node): RatFn | null => {
    if (!containsVar(node, names)) return constant(node);
    switch (node.type) {
      case "var":
        return { n: [N.ZERO, N.ONE], d: [N.ONE] };
      case "add":
      case "sub": {
        const a = rec(node.l),
          b = rec(node.r);
        if (!a || !b) return null;
        const bn = node.type === "sub" ? pScale(b.n, N.int(-1)) : b.n;
        if (deg(a.d) === 0 && deg(b.d) === 0) return norm({ n: pAdd(a.n, bn), d: [N.ONE] });
        return norm({ n: pAdd(pMul(a.n, b.d), pMul(bn, a.d)), d: pMul(a.d, b.d) });
      }
      case "mul": {
        const a = rec(node.l),
          b = rec(node.r);
        if (!a || !b) return null;
        return norm({ n: pMul(a.n, b.n), d: pMul(a.d, b.d) });
      }
      case "div": {
        const a = rec(node.l),
          b = rec(node.r);
        if (!a || !b || isZeroPoly(b.n)) return null;
        return norm({ n: pMul(a.n, b.d), d: pMul(a.d, b.n) });
      }
      case "neg": {
        const a = rec(node.arg);
        return a && { n: pScale(a.n, N.int(-1)), d: a.d };
      }
      case "pct": {
        const a = rec(node.arg);
        return a && norm({ n: pScale(a.n, N.rat(1n, 100n)), d: a.d });
      }
      case "pow": {
        if (containsVar(node.r, names)) return null;
        const e = evaluate(node.r, env);
        if (e.k !== "q") return null;
        const ef = N.toF(e.num);
        if (!Number.isInteger(ef) || Math.abs(ef) > 20) return null;
        const a = rec(node.l);
        if (!a) return null;
        let r: RatFn = { n: [N.ONE], d: [N.ONE] };
        for (let i = 0; i < Math.abs(ef); i++) r = { n: pMul(r.n, a.n), d: pMul(r.d, a.d) };
        return norm(ef < 0 ? { n: r.d, d: r.n } : r);
      }
      default:
        return null;
    }
  };
  try {
    return rec(g);
  } catch {
    return null;
  }
}

/** Real roots of a float polynomial via derivative bracketing (handles multiple roots). */
function floatPolyRoots(c: number[]): number[] {
  while (c.length > 1 && c[c.length - 1] === 0) c = c.slice(0, -1);
  const n = c.length - 1;
  if (n <= 0) return [];
  if (n === 1) return [-c[0] / c[1]];
  if (n === 2) {
    const [cc, b, a] = c;
    const disc = b * b - 4 * a * cc;
    const scale = Math.max(b * b, Math.abs(4 * a * cc));
    if (disc < -1e-13 * scale) return [];
    if (Math.abs(disc) <= 1e-13 * scale) return [-b / (2 * a)];
    const s = Math.sqrt(disc);
    const q1 = -0.5 * (b + Math.sign(b || 1) * s);
    const r1 = q1 / a,
      r2 = q1 !== 0 ? cc / q1 : -r1;
    return dedupeSorted([r1, r2]);
  }
  const dc = c.slice(1).map((x, i) => x * (i + 1));
  const crit = floatPolyRoots(dc);
  let B = 0;
  for (let i = 0; i < n; i++) B = Math.max(B, Math.abs(c[i] / c[n]));
  B += 1;
  const pts = [-B, ...crit.filter((x) => Math.abs(x) < B), B];
  const scaleAt = (x: number) => c.reduce((acc, ci, i) => acc + Math.abs(ci) * Math.abs(x) ** i, 0);
  const roots: number[] = [];
  for (const x of crit) if (Math.abs(pEvalF(c, x)) <= 1e-11 * scaleAt(x)) roots.push(x);
  const f = (x: number) => pEvalF(c, x);
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i],
      b = pts[i + 1];
    const fa = f(a),
      fb = f(b);
    if (fa === 0) roots.push(a);
    if (fa * fb < 0) roots.push(brent(f, a, b, fa, fb));
  }
  if (f(pts[pts.length - 1]) === 0) roots.push(pts[pts.length - 1]);
  return dedupeSorted(roots, 1e-10);
}

function lcmDen(p: Poly): bigint {
  let l = 1n;
  for (const c of p) if (c.e) l = (l / N.bgcd(l, c.d)) * c.d;
  return l;
}

/** Exact quadratic roots for rational coefficients [c, b, a]. */
function exactQuadratic(p: Poly): Root[] {
  const L = lcmDen(p);
  const [C, B, A] = p.map((x) => (x.e ? (x.n * L) / x.d : 0n));
  const disc = B * B - 4n * A * C;
  if (disc < 0n) return [];
  if (disc === 0n) {
    const r = N.rat(-B, 2n * A);
    return [{ v: N.toF(r), node: numNode(r) }];
  }
  const sd = N.iroot(disc, 2);
  if (sd !== null) {
    return [N.rat(-B - sd, 2n * A), N.rat(-B + sd, 2n * A)].map((r) => ({ v: N.toF(r), node: numNode(r) }));
  }
  const [k, m] = isqrtParts(disc);
  const sq = Math.sqrt(Number(m)) * Number(k);
  const a2 = 2 * Number(A);
  return [
    { v: (-Number(B) - sq) / a2, node: surdNode(-B, -k, m, 2n * A) },
    { v: (-Number(B) + sq) / a2, node: surdNode(-B, k, m, 2n * A) },
  ];
}

/** Synthetic division of p by (x - r). */
function deflate(p: Poly, r: Num): Poly {
  const n = p.length - 1;
  const out: Num[] = new Array(n).fill(N.ZERO);
  let acc = N.ZERO;
  for (let i = n; i >= 1; i--) {
    acc = N.add(N.mul(acc, r), p[i]);
    out[i - 1] = acc;
  }
  return pTrim(out);
}

/** Real roots of a polynomial with exact rational coefficients, exact where possible. */
function exactPolyRoots(p: Poly): Root[] {
  p = pTrim(p);
  const roots: Root[] = [];
  while (p.length > 1 && N.isZero(p[0])) {
    roots.push({ v: 0, node: numNode(N.ZERO) });
    p = p.slice(1);
  }
  // Rational roots: find numeric candidates and verify exactly.
  for (let guard = 0; guard < 64 && deg(p) >= 1; guard++) {
    const cands = floatPolyRoots(p.map(N.toF));
    let found = false;
    for (const c of cands) {
      const r = N.toRat(c, 1000000, 1e-7);
      if (r && N.isZero(pEval(p, r))) {
        roots.push({ v: N.toF(r), node: numNode(r) });
        p = deflate(p, r);
        found = true;
        break;
      }
    }
    if (!found) break;
  }
  const d = deg(p);
  if (d === 1) {
    // The candidate search above can miss roots with large denominators (1000001*x=1).
    const r = N.div(N.neg(p[0]), p[1]);
    roots.push({ v: N.toF(r), node: numNode(r) });
  } else if (d === 2) roots.push(...exactQuadratic(p));
  else if (d === 4 && N.isZero(p[1]) && N.isZero(p[3])) {
    // Biquadratic: substitute y = x²
    for (const y of exactQuadratic([p[0], p[2], p[4]])) {
      if (y.v < 0) continue;
      if (y.v === 0) {
        roots.push({ v: 0, node: numNode(N.ZERO) });
        continue;
      }
      if (y.node.type === "num" && y.node.value.e) {
        roots.push(sqrtRational(y.node.value, true), sqrtRational(y.node.value, false));
      } else {
        const s = Math.sqrt(y.v);
        const sq: Node = { type: "call", name: "sqrt", args: [y.node] };
        roots.push({ v: -s, node: { type: "neg", arg: sq } }, { v: s, node: sq });
      }
    }
  } else if (d >= 3) {
    roots.push(...rootsFromFloats(floatPolyRoots(p.map(N.toF)), true));
  }
  return roots;
}

function polyRoots(p: Poly, exact: boolean): Root[] {
  p = pTrim(p);
  if (exact && p.every((c) => c.e)) return exactPolyRoots(p);
  return floatPolyRoots(p.map(N.toF)).map(floatRoot);
}

// ---------------------------------------------------------------- numeric 1D

function brent(f: (x: number) => number, a: number, b: number, fa: number, fb: number): number {
  let c = a,
    fc = fa,
    d = b - a,
    e = d;
  for (let iter = 0; iter < 200; iter++) {
    if (fb * fc > 0) {
      c = a;
      fc = fa;
      d = e = b - a;
    }
    if (Math.abs(fc) < Math.abs(fb)) {
      a = b;
      b = c;
      c = a;
      fa = fb;
      fb = fc;
      fc = fa;
    }
    const tol = 2 * Number.EPSILON * Math.abs(b) + 1e-300;
    const m = 0.5 * (c - b);
    if (Math.abs(m) <= tol || fb === 0) return b;
    if (Math.abs(e) >= tol && Math.abs(fa) > Math.abs(fb)) {
      const s = fb / fa;
      let p: number, qq: number;
      if (a === c) {
        p = 2 * m * s;
        qq = 1 - s;
      } else {
        const qa = fa / fc,
          r = fb / fc;
        p = s * (2 * m * qa * (qa - r) - (b - a) * (r - 1));
        qq = (qa - 1) * (r - 1) * (s - 1);
      }
      if (p > 0) qq = -qq;
      else p = -p;
      if (2 * p < Math.min(3 * m * qq - Math.abs(tol * qq), Math.abs(e * qq))) {
        e = d;
        d = p / qq;
      } else {
        d = m;
        e = m;
      }
    } else {
      d = m;
      e = m;
    }
    a = b;
    fa = fb;
    b += Math.abs(d) > tol ? d : m > 0 ? tol : -tol;
    fb = f(b);
  }
  return b;
}

function goldenMin(f: (x: number) => number, a: number, b: number): number {
  const g = (Math.sqrt(5) - 1) / 2;
  let c = b - g * (b - a),
    d = a + g * (b - a);
  let fc = f(c),
    fd = f(d);
  for (let i = 0; i < 90; i++) {
    if (fc < fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - g * (b - a);
      fc = f(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + g * (b - a);
      fd = f(d);
    }
  }
  return (a + b) / 2;
}

function samplePoints(lo: number, hi: number): number[] {
  const pts: number[] = [0];
  for (let k = -300; k <= 300; k++) {
    const x = 10 ** (k / 10);
    pts.push(x, -x);
  }
  for (let i = -1000; i <= 1000; i++) pts.push(i / 10);
  if (Number.isFinite(lo) && Number.isFinite(hi)) {
    for (let i = 0; i <= 2000; i++) pts.push(lo + ((hi - lo) * i) / 2000);
  } else if (Number.isFinite(lo)) {
    for (let i = 0; i <= 1000; i++) pts.push(lo + i / 10);
  } else if (Number.isFinite(hi)) {
    for (let i = 0; i <= 1000; i++) pts.push(hi - i / 10);
  }
  const inRange = pts.filter((x) => x >= lo && x <= hi);
  if (Number.isFinite(lo)) inRange.push(lo);
  if (Number.isFinite(hi)) inRange.push(hi);
  return [...new Set(inRange)].sort((a, b) => a - b);
}

interface Scan {
  roots: number[];
  /** Points where the function stops being defined (domain edges). */
  edges: number[];
}

function scanRoots(f: (x: number) => number, lo = -Infinity, hi = Infinity): Scan {
  const xs = samplePoints(lo, hi);
  const ys = xs.map(f);
  const roots: number[] = [];
  const edges: number[] = [];
  const ok = (y: number) => Number.isFinite(y);
  for (let i = 0; i + 1 < xs.length; i++) {
    const a = xs[i],
      b = xs[i + 1],
      fa = ys[i],
      fb = ys[i + 1];
    if (ok(fa) && fa === 0) roots.push(a);
    if (ok(fa) && ok(fb) && fa * fb < 0) {
      const r = brent(f, a, b, fa, fb);
      const fr = f(r);
      if (ok(fr) && Math.abs(fr) <= Math.min(Math.abs(fa), Math.abs(fb))) roots.push(r);
    } else if (ok(fa) !== ok(fb)) {
      // Bisect for the domain edge.
      let l = a,
        h = b;
      for (let k = 0; k < 80; k++) {
        const m = (l + h) / 2;
        if (ok(f(m)) === ok(fa)) l = m;
        else h = m;
      }
      const edge = ok(fa) ? l : h;
      edges.push(edge);
      const fe = f(edge);
      if (ok(fe) && Math.abs(fe) < 1e-9 * Math.max(Math.abs(ok(fa) ? fa : fb), 1e-300)) roots.push(edge);
    }
  }
  const last = ys[ys.length - 1];
  if (ok(last) && last === 0) roots.push(xs[xs.length - 1]);
  // Touching roots (even multiplicity): local minima of |f| close to 0.
  for (let i = 1; i + 1 < xs.length; i++) {
    const [y0, y1, y2] = [ys[i - 1], ys[i], ys[i + 1]];
    if (!ok(y0) || !ok(y1) || !ok(y2) || y1 === 0) continue;
    if (Math.sign(y0) !== Math.sign(y1) || Math.sign(y2) !== Math.sign(y1)) continue;
    if (Math.abs(y1) > Math.abs(y0) || Math.abs(y1) > Math.abs(y2)) continue;
    const m = goldenMin((x) => Math.abs(f(x)), xs[i - 1], xs[i + 1]);
    const fm = f(m);
    if (ok(fm) && Math.abs(fm) <= 1e-10 * Math.max(Math.abs(y0), Math.abs(y2))) roots.push(m);
  }
  return { roots: dedupeSorted(roots, 1e-8), edges: dedupeSorted(edges, 1e-8) };
}

// ---------------------------------------------------------------- equations

interface Problem {
  eqs: Node[]; // relations
  vars: string[];
  guess?: Map<string, number>;
}

function collectEquations(n: Node): Node[] {
  if (n.type === "list") return n.items.flatMap(collectEquations);
  if (n.type === "call" && n.name === "system") return n.args.flatMap(collectEquations);
  if (n.type === "and") return conjuncts(n).flatMap(collectEquations);
  if (n.type === "rel") return [n];
  if (n.type === "or") throw new EvalError("solve() does not support 'or' between equations");
  return [{ type: "rel", op: "=", l: n, r: { type: "num", value: N.ZERO } }];
}

function collectVars(n: Node | undefined, eqs: Node[], env: Env, guesses: Map<string, number>): string[] {
  if (!n) {
    const fv = freeVars({ type: "list", items: eqs }, env);
    if (!fv.length) throw new EvalError("No variable to solve for");
    if (fv.length > eqs.length) throw new EvalError(`Specify the variable: solve(equation, ${fv[0]})`);
    return fv;
  }
  if (n.type === "var") return [n.name];
  if (n.type === "list") return n.items.flatMap((x) => collectVars(x, eqs, env, guesses));
  if (n.type === "rel" && n.op === "=" && n.l.type === "var") {
    const g = evaluate(n.r, env);
    if (g.k === "q") guesses.set(n.l.name, N.toF(g.num));
    return [n.l.name];
  }
  if (n.type === "and") return conjuncts(n).flatMap((x) => collectVars(x, eqs, env, guesses));
  throw new EvalError("Expected a variable (or list of variables) to solve for");
}

const difference = (r: Extract<Node, { type: "rel" }>): Node => ({ type: "sub", l: r.l, r: r.r });

export function hasFloat(n: Node, env: Env): boolean {
  let found = false;
  walk(n, (x) => {
    if (x.type === "num" && !x.value.e) found = true;
    if (x.type === "unit" && !lookupNspire(x.name)?.factor.e && !lookupNspire(x.name)?.angle) found = true;
    if (x.type === "var") {
      const v = lookupVar(x.name, env);
      if (v?.k === "q" && !v.num.e) found = true;
    }
  });
  return found;
}

function makeF(g: Node, vars: string[], dims: Dim[], env: Env): (xs: number[]) => number {
  return (xs) => {
    const locals = new Map(env.locals ?? []);
    vars.forEach((v, i) => locals.set(v, q(N.fl(xs[i]), dims[i])));
    try {
      const r = evaluate(g, { ...env, locals, constraints: [] });
      return r.k === "q" ? N.toF(r.num) : NaN;
    } catch {
      return NaN;
    }
  };
}

function boundsFromConstraints(x: string, dim: Dim, env: Env): [number, number] {
  let lo = -Infinity,
    hi = Infinity;
  for (const c of env.constraints ?? []) {
    for (const r of conjuncts(c)) {
      if (r.type !== "rel") continue;
      let op = r.op,
        other: Node;
      if (r.l.type === "var" && r.l.name === x && !containsVar(r.r, new Set([x]))) other = r.r;
      else if (r.r.type === "var" && r.r.name === x && !containsVar(r.l, new Set([x]))) {
        other = r.l;
        op = ({ "<": ">", ">": "<", "≤": "≥", "≥": "≤" } as Record<string, RelOp>)[op] ?? op;
      } else continue;
      try {
        const v = evaluate(other, env);
        if (v.k !== "q") continue;
        const b = N.toF(v.num);
        if (op === ">" || op === "≥") lo = Math.max(lo, b);
        if (op === "<" || op === "≤") hi = Math.min(hi, b);
      } catch {
        // ignore
      }
    }
  }
  void dim;
  return [lo, hi];
}

function satisfiesConstraints(assign: Map<string, Value>, env: Env): boolean {
  if (!env.constraints?.length) return true;
  const locals = new Map(env.locals ?? []);
  assign.forEach((v, k) => locals.set(k, v));
  for (const c of env.constraints) {
    try {
      const r = evaluate(c, { ...env, locals, constraints: [] });
      if (r.k === "bool" && !r.v) return false;
    } catch {
      // Conditions that do not apply to these variables are ignored.
    }
  }
  return true;
}

interface SingleResult {
  roots: Root[];
  all?: boolean;
  truncated?: boolean;
  /** Period of the solution set: x = root + period·n1. */
  period?: Root;
}

/** Finds the smallest common period of f among typical trig periods, if any. */
function detectPeriod(f: (x: number) => number, roots: number[], angle: AngleMode): number | null {
  const cands = new Set<number>();
  for (let k = 1; k <= 12; k++) cands.add((2 * Math.PI) / ANGLE_FACTOR[angle] / k);
  for (const k of [0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12]) cands.add(k);
  const sorted = [...cands].sort((a, b) => a - b);
  const probes = Array.from({ length: 31 }, (_, i) => -7.3 + i * 0.4871);
  let P: number | null = null;
  for (const c of sorted) {
    let checked = 0,
      ok = true;
    for (const x of probes) {
      const a = f(x),
        b = f(x + c);
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      checked++;
      if (Math.abs(a - b) > 1e-9 * (1 + Math.abs(a))) {
        ok = false;
        break;
      }
    }
    if (ok && checked >= 10) {
      P = c;
      break;
    }
  }
  if (P === null) return null;
  // The zero set may repeat faster than f (cos x = 0 repeats every π).
  const mod = (r: number, m: number) => ((r % m) + m) % m;
  const residues = dedupeSorted(
    roots.filter((r) => Math.abs(r) < 8 * P! + 1).map((r) => mod(r, P!)),
    1e-7,
  );
  const near = (a: number, b: number) => Math.min(Math.abs(a - b), P! - Math.abs(a - b)) < 1e-7 * Math.max(1, P!);
  for (let m = 6; m >= 2; m--) {
    if (residues.every((r) => residues.some((s) => near(mod(r + P! / m, P!), s)))) return P / m;
  }
  return P;
}

function solveSingle(g: Node, x: string, dim: Dim, env: Env): SingleResult {
  const exact = env.settings.mode !== "approx" && !hasFloat(g, env);
  const f1 = makeF(g, [x], [dim], env);
  const f = (t: number) => f1([t]);
  const rf = ratOf(g, x, env);
  let roots: Root[];
  if (rf) {
    if (isZeroPoly(rf.n)) return { roots: [], all: true };
    roots = polyRoots(rf.n, exact).filter((r) => {
      if (deg(rf.d) === 0) return true;
      const dv = pEvalF(rf.d.map(N.toF), r.v);
      const scale = rf.d.reduce((acc, c, i) => acc + Math.abs(N.toF(c)) * Math.abs(r.v) ** i, 0);
      return Math.abs(dv) > 1e-12 * scale;
    });
    // Rational path ignores domain restrictions from non-rational parts, so verify.
    roots = roots.filter((r) => Number.isFinite(f(r.v)) || !Number.isFinite(f(r.v + 1e-9)));
  } else {
    const [lo, hi] = boundsFromConstraints(x, dim, env);
    const scan = scanRoots(f, lo, hi);
    if (!env.constraints?.length && scan.roots.length >= 4 && dim.every((d) => d === 0)) {
      const P = detectPeriod(f, scan.roots, env.settings.angle);
      if (P !== null) {
        // Representatives in (-P/2, P/2]
        const reps = dedupeSorted(
          scan.roots
            .filter((r) => Math.abs(r) < 8 * P + 1)
            .map((r) => {
              let m = ((r % P) + P) % P;
              if (m > P / 2 + 1e-12) m -= P;
              return Math.abs(m) < 1e-12 * P ? 0 : m;
            }),
          1e-7,
        ).map((r) => polishRoot(f, r));
        const rs = rootsFromFloats(reps, exact);
        const period = rootsFromFloats([P], exact)[0];
        return { roots: rs, period };
      }
    }
    roots = rootsFromFloats(scan.roots, exact);
  }
  roots = roots.filter((r) => satisfiesConstraints(new Map([[x, q(N.fl(r.v), dim)]]), env));
  roots.sort((a, b) => a.v - b.v);
  let truncated = false;
  if (roots.length > MAX_SHOWN) {
    truncated = true;
    roots = [...roots].sort((a, b) => Math.abs(a.v) - Math.abs(b.v)).slice(0, MAX_SHOWN);
    roots.sort((a, b) => a.v - b.v);
  }
  return { roots, truncated };
}

function polishRoot(f: (x: number) => number, x: number): number {
  for (let i = 0; i < 8; i++) {
    const h = 1e-7 * Math.max(1, Math.abs(x));
    const fx = f(x),
      d = (f(x + h) - f(x - h)) / (2 * h);
    if (!Number.isFinite(fx) || !Number.isFinite(d) || d === 0) break;
    const nx = x - fx / d;
    if (Math.abs(nx - x) > 1e-6 * Math.max(1, Math.abs(x))) break;
    x = nx;
  }
  return x;
}

function periodicNode(x: string, r: Root, period: Root): Node {
  const term: Node = { type: "mul", l: period.node, r: { type: "var", name: "n1" } };
  const rhs: Node = r.v === 0 ? term : { type: "add", l: r.node, r: term };
  return { type: "rel", op: "=", l: { type: "var", name: x }, r: rhs };
}

function valueNode(r: Root, dim: Dim): Node {
  return withUnit(r.node, unitNodeForDim(dim));
}

function eqNode(x: string, r: Root, dim: Dim): Node {
  return { type: "rel", op: "=", l: { type: "var", name: x }, r: valueNode(r, dim) };
}

// ---------------------------------------------------------------- inequalities

function solveInequality(rel: Extract<Node, { type: "rel" }>, x: string, dim: Dim, env: Env): Node {
  const g = difference(rel);
  const exact = env.settings.mode !== "approx" && !hasFloat(g, env);
  const f1 = makeF(g, [x], [dim], env);
  const f = (t: number) => f1([t]);
  const op = rel.op;
  const crit: (Root & { kind: "root" | "pole" | "bound" })[] = [];
  // Boundaries of conditions on x (solve(x^2>4,x)|x<0) split the line too.
  for (const c of env.constraints ?? []) {
    for (const r of conjuncts(c)) {
      if (r.type !== "rel" || freeVars(r, env).some((v) => v !== x) || !containsVar(r, new Set([x]))) continue;
      for (const b of criticalPoints(difference(r), x, dim, env, exact)) crit.push({ ...b, kind: "bound" });
    }
  }
  const inDomain = (t: number) => satisfiesConstraints(new Map([[x, q(N.fl(t), dim)]]), env);
  const rf = ratOf(g, x, env);
  if (rf) {
    if (isZeroPoly(rf.n)) return { type: "bool", value: op === "≤" || op === "≥" };
    for (const r of polyRoots(rf.n, exact)) crit.push({ ...r, kind: "root" });
    if (deg(rf.d) > 0) for (const r of polyRoots(rf.d, exact)) crit.push({ ...r, kind: "pole" });
  } else {
    const scan = scanRoots(f, ...boundsFromConstraints(x, dim, env));
    for (const r of rootsFromFloats(scan.roots, exact)) crit.push({ ...r, kind: "root" });
    for (const e of scan.edges)
      if (!crit.some((c) => Math.abs(c.v - e) < 1e-9 * Math.max(1, Math.abs(e))))
        crit.push({ ...floatRoot(e), node: (exact && recognize(e)) || numNode(N.fl(e)), kind: "pole" });
  }
  crit.sort((a, b) => a.v - b.v);
  const pts: typeof crit = [];
  for (const c of crit) {
    const last = pts[pts.length - 1];
    if (last && Math.abs(last.v - c.v) <= 1e-9 * Math.max(1, Math.abs(c.v))) {
      if (c.kind === "pole" || (c.kind === "root" && last.kind === "bound")) Object.assign(last, c);
      continue;
    }
    pts.push(c);
  }
  if (pts.length > 40) throw new EvalError("Too many critical points to solve this inequality");
  const sat = (t: number) => {
    const y = f(t);
    if (!Number.isFinite(y)) return false;
    switch (op) {
      case "<":
        return y < 0;
      case ">":
        return y > 0;
      case "≤":
        return y <= 0;
      case "≥":
        return y >= 0;
      case "≠":
        return y !== 0;
      default:
        return y === 0;
    }
  };
  // Pieces: (-∞,p0), p0, (p0,p1), p1, ..., (pk,∞)
  type Piece = { lo?: (typeof pts)[number]; hi?: (typeof pts)[number]; point?: (typeof pts)[number]; ok: boolean };
  const pieces: Piece[] = [];
  const mid = (a: number | undefined, b: number | undefined) =>
    a === undefined && b === undefined
      ? 0
      : a === undefined
        ? b! - Math.max(1, Math.abs(b!))
        : b === undefined
          ? a + Math.max(1, Math.abs(a))
          : (a + b) / 2;
  for (let i = 0; i <= pts.length; i++) {
    const lo = pts[i - 1],
      hi = pts[i];
    const m = mid(lo?.v, hi?.v);
    pieces.push({ lo, hi, ok: sat(m) && inDomain(m) });
    if (hi) {
      const atRoot = hi.kind === "root" ? (op === "≤" || op === "≥") && Number.isFinite(f(hi.v)) : sat(hi.v);
      pieces.push({ point: hi, ok: atRoot && inDomain(hi.v) });
    }
  }
  const varNode: Node = { type: "var", name: x };
  const out: Node[] = [];
  let i = 0;
  while (i < pieces.length) {
    if (!pieces[i].ok) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < pieces.length && pieces[j + 1].ok) j++;
    const start = pieces[i],
      end = pieces[j];
    const loB = start.point ?? start.lo,
      hiB = end.point ?? end.hi;
    const loIncl = !!start.point,
      hiIncl = !!end.point;
    if (start.point && i === j) out.push(eqNode(x, start.point, dim));
    else if (!loB && !hiB) return { type: "bool", value: true };
    else if (!loB) out.push({ type: "rel", op: hiIncl ? "≤" : "<", l: varNode, r: valueNode(hiB!, dim) });
    else if (!hiB) out.push({ type: "rel", op: loIncl ? "≥" : ">", l: varNode, r: valueNode(loB, dim) });
    else
      out.push({
        type: "and",
        l: { type: "rel", op: loIncl ? "≤" : "<", l: valueNode(loB, dim), r: varNode },
        r: { type: "rel", op: hiIncl ? "≤" : "<", l: varNode, r: valueNode(hiB, dim) },
      });
    i = j + 1;
  }
  if (!out.length) return { type: "bool", value: false };
  return joinWith("or", out);
}

/** Points where g changes sign in x: roots and poles. */
function criticalPoints(g: Node, x: string, dim: Dim, env: Env, exact: boolean): Root[] {
  const rf = ratOf(g, x, env);
  if (rf) return [...polyRoots(rf.n, exact), ...(deg(rf.d) > 0 ? polyRoots(rf.d, exact) : [])];
  const f1 = makeF(g, [x], [dim], env);
  const scan = scanRoots((t) => f1([t]));
  return rootsFromFloats([...scan.roots, ...scan.edges], exact);
}

/**
 * Applies the conditions after | to solutions, one "or" alternative of "and"-ed x=value answers at a time.
 * Numeric answers that break a condition are dropped. When an answer still contains parameters
 * (solve(x^2=a^2,x)|x>0, or c1 from an underdetermined system), the condition is rewritten in those
 * parameters and kept with the answer (x=-a and a<0 or x=a and a>0), or dropped if it can never hold.
 */
function applyConstraints(node: Node, env: Env): Node {
  if (!env.constraints?.length) return node;
  const plain = { ...env, constraints: [] };
  const kept: Node[] = [];
  for (const alt of disjuncts(node)) {
    const assign = new Map<string, Value>();
    const symbolic = new Map<string, Node>();
    let solvable = true;
    for (const r of conjuncts(alt)) {
      if (r.type !== "rel" || r.op !== "=" || r.l.type !== "var") {
        solvable = false;
        break;
      }
      let v: Value | null = null;
      try {
        v = evaluate(r.r, plain);
      } catch {
        // Contains parameters.
      }
      if (v?.k === "q") assign.set(r.l.name, v);
      else symbolic.set(r.l.name, r.r);
    }
    if (!solvable) {
      kept.push(alt);
      continue;
    }
    if (!symbolic.size) {
      if (satisfiesConstraints(assign, env)) kept.push(alt);
      continue;
    }
    const conds = conditionsIn(symbolic, assign, env);
    if (conds) kept.push(joinWith("and", [...conjuncts(alt), ...conds]));
  }
  return kept.length ? joinWith("or", kept) : { type: "bool", value: false };
}

const isNonNegative = (n: Node) => n.type === "call" && (n.name === "sqrt" || n.name === "abs");

const FLIP: Partial<Record<RelOp, RelOp>> = { "<": ">", ">": "<", "≤": "≥", "≥": "≤" };

/**
 * The conditions after | on the solved variables, rewritten in the parameters of a symbolic answer.
 * Returns null when one of them can never hold.
 */
function conditionsIn(symbolic: Map<string, Node>, assign: Map<string, Value>, env: Env): Node[] | null {
  const solved = new Set([...symbolic.keys(), ...assign.keys()]);
  const subst = (n: Node): Node => {
    if (n.type === "var" && symbolic.has(n.name)) return symbolic.get(n.name)!;
    return mapChildren(n, subst);
  };
  const locals = new Map(env.locals ?? []);
  assign.forEach((v, k) => locals.set(k, v));
  const out: Node[] = [];
  for (const c of env.constraints ?? []) {
    for (const r of conjuncts(c)) {
      if (r.type !== "rel" || !containsVar(r, solved)) continue;
      let rel: Extract<Node, { type: "rel" }> = { ...r, l: subst(r.l), r: subst(r.r) };
      try {
        const alg = new Algebra(env, new Set(freeVars(rel, env)));
        rel = { ...rel, l: alg.simplifyNode(rel.l), r: alg.simplifyNode(rel.r) };
      } catch {
        // Keep the unsimplified condition.
      }
      // -a>0 reads better as a<0.
      if (rel.l.type === "neg" && rel.r.type === "num" && N.isZero(rel.r.value) && FLIP[rel.op])
        rel = { ...rel, op: FLIP[rel.op]!, l: rel.l.arg };
      // √(a) and abs(a) are never negative.
      if (isNonNegative(rel.l) && rel.r.type === "num" && N.isZero(rel.r.value)) {
        if (rel.op === "<") return null;
        if (rel.op === "≥") continue;
      }
      try {
        const v = evaluate(rel, { ...env, locals, constraints: [] });
        if (v.k === "bool") {
          if (!v.v) return null;
          continue;
        }
      } catch {
        // Depends on the parameters.
      }
      out.push(rel);
    }
  }
  return out;
}

// ---------------------------------------------------------------- systems

interface Lin {
  c: Num;
  a: Num[];
}

function linOf(g: Node, vars: string[], env: Env): Lin | null {
  const names = new Set(vars);
  const n = vars.length;
  const zero = (): Num[] => new Array(n).fill(N.ZERO);
  const isConst = (l: Lin) => l.a.every(N.isZero);
  const rec = (node: Node): Lin | null => {
    if (!containsVar(node, names)) {
      const v = evaluate(node, env);
      return v.k === "q" ? { c: v.num, a: zero() } : null;
    }
    switch (node.type) {
      case "var": {
        const a = zero();
        a[vars.indexOf(node.name)] = N.ONE;
        return { c: N.ZERO, a };
      }
      case "add":
      case "sub": {
        const l = rec(node.l),
          r = rec(node.r);
        if (!l || !r) return null;
        const s = node.type === "sub" ? N.int(-1) : N.ONE;
        return { c: N.add(l.c, N.mul(s, r.c)), a: l.a.map((x, i) => N.add(x, N.mul(s, r.a[i]))) };
      }
      case "neg": {
        const l = rec(node.arg);
        return l && { c: N.neg(l.c), a: l.a.map(N.neg) };
      }
      case "mul": {
        const l = rec(node.l),
          r = rec(node.r);
        if (!l || !r) return null;
        if (isConst(l)) return { c: N.mul(l.c, r.c), a: r.a.map((x) => N.mul(x, l.c)) };
        if (isConst(r)) return { c: N.mul(l.c, r.c), a: l.a.map((x) => N.mul(x, r.c)) };
        return null;
      }
      case "div": {
        const l = rec(node.l),
          r = rec(node.r);
        if (!l || !r || !isConst(r) || N.isZero(r.c)) return null;
        return { c: N.div(l.c, r.c), a: l.a.map((x) => N.div(x, r.c)) };
      }
      default:
        return null;
    }
  };
  try {
    return rec(g);
  } catch {
    return null;
  }
}

function solveLinearSystem(rows: Lin[], vars: string[], dims: Dim[], exact: boolean): Node {
  const m = rows.length,
    n = vars.length;
  const conv = (x: Num) => (exact ? x : N.toFloat(x));
  const A = rows.map((r) => [...r.a.map(conv), conv(N.neg(r.c))]);
  const isZ = (x: Num) => (x.e ? x.n === 0n : Math.abs(x.v) < 1e-12);
  const pivots: number[] = [];
  let row = 0;
  for (let col = 0; col < n && row < m; col++) {
    let best = -1;
    for (let r = row; r < m; r++) {
      if (isZ(A[r][col])) continue;
      if (best < 0 || (!exact && Math.abs(N.toF(A[r][col])) > Math.abs(N.toF(A[best][col])))) best = r;
    }
    if (best < 0) continue;
    [A[row], A[best]] = [A[best], A[row]];
    const pv = A[row][col];
    A[row] = A[row].map((x) => N.div(x, pv));
    for (let r = 0; r < m; r++) {
      if (r === row || isZ(A[r][col])) continue;
      const fct = A[r][col];
      A[r] = A[r].map((x, k) => N.sub(x, N.mul(fct, A[row][k])));
    }
    pivots.push(col);
    row++;
  }
  for (let r = row; r < m; r++) if (!isZ(A[r][n])) return { type: "bool", value: false };
  const free = vars.map((_, i) => i).filter((i) => !pivots.includes(i));
  const paramName = new Map(free.map((f, k) => [f, `c${k + 1}`]));
  const parts: Node[] = [];
  vars.forEach((v, i) => {
    let expr: Node;
    if (paramName.has(i)) expr = { type: "var", name: paramName.get(i)! };
    else {
      const r = pivots.indexOf(i);
      const cst = A[r][n];
      expr = numNode(isZ(cst) ? N.ZERO : cst);
      for (const fcol of free) {
        const coef = A[r][fcol];
        if (isZ(coef)) continue;
        const c = N.neg(coef);
        const negative = N.sign(c) < 0;
        const absC = negative ? N.neg(c) : c;
        const pv: Node = { type: "var", name: paramName.get(fcol)! };
        const term: Node = N.cmp(absC, N.ONE) === 0 ? pv : { type: "mul", l: numNode(absC), r: pv };
        if (expr.type === "num" && N.isZero(expr.value)) expr = negative ? { type: "neg", arg: term } : term;
        else expr = negative ? { type: "sub", l: expr, r: term } : { type: "add", l: expr, r: term };
      }
    }
    parts.push({ type: "rel", op: "=", l: { type: "var", name: v }, r: withUnit(expr, unitNodeForDim(dims[i])) });
  });
  return joinWith("and", parts);
}

function gaussSolve(J: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = J.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-300) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

function newtonSystem(fs: ((xs: number[]) => number)[], n: number, guesses?: number[]): number[][] {
  const F = (x: number[]) => fs.map((f) => f(x));
  const norm = (v: number[]) => Math.max(...v.map(Math.abs));
  const starts: number[][] = [];
  if (guesses) starts.push(guesses);
  const vals = [-10, -3, -1, -0.3, 0.3, 1, 3, 10, 0.1, 30];
  if (n <= 3) {
    const rec = (prefix: number[]) => {
      if (prefix.length === n) {
        starts.push(prefix);
        return;
      }
      for (const v of vals.slice(0, n === 3 ? 8 : 10)) rec([...prefix, v]);
    };
    rec([]);
  } else {
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) * 20 - 10;
    for (let k = 0; k < 400; k++) starts.push(Array.from({ length: n }, rnd));
  }
  const sols: number[][] = [];
  for (const s of starts) {
    let x = [...s];
    let fx = F(x);
    if (fx.some((v) => !Number.isFinite(v))) continue;
    let converged = false;
    for (let it = 0; it < 60; it++) {
      const J = fs.map(() => new Array(n).fill(0));
      for (let j = 0; j < n; j++) {
        const h = 1e-7 * Math.max(1, Math.abs(x[j]));
        const xp = [...x];
        xp[j] += h;
        const fp = F(xp);
        for (let i = 0; i < fs.length; i++) J[i][j] = (fp[i] - fx[i]) / h;
      }
      const dx = gaussSolve(
        J,
        fx.map((v) => -v),
      );
      if (!dx || dx.some((v) => !Number.isFinite(v))) break;
      // Damped step
      let t = 1;
      let xn = x.map((v, i) => v + dx[i]);
      let fn = F(xn);
      while ((fn.some((v) => !Number.isFinite(v)) || norm(fn) > norm(fx)) && t > 1e-4) {
        t /= 2;
        xn = x.map((v, i) => v + t * dx[i]);
        fn = F(xn);
      }
      if (fn.some((v) => !Number.isFinite(v))) break;
      const step = norm(dx.map((v) => v * t));
      x = xn;
      fx = fn;
      if (step <= 1e-13 * Math.max(1, norm(x))) {
        converged = true;
        break;
      }
    }
    if (!converged) continue;
    // Accept only true zeros, not local minima of |F|.
    const pert = F(x.map((v) => v * (1 + 1e-6) + 1e-9));
    if (norm(fx) > 1e-6 * Math.max(norm(pert), 1e-300) && norm(fx) > 1e-14) continue;
    if (!sols.some((sol) => sol.every((v, i) => Math.abs(v - x[i]) <= 1e-7 * Math.max(1, Math.abs(v))))) sols.push(x);
  }
  return sols;
}

function solveSystem(
  eqs: Extract<Node, { type: "rel" }>[],
  vars: string[],
  env: Env,
  guesses: Map<string, number>,
): Node {
  if (eqs.some((e) => e.op !== "=")) throw new EvalError("Inequalities are only supported with a single variable");
  const gs = eqs.map(difference);
  const dims = inferDims(gs, vars, env);
  const exact = env.settings.mode !== "approx" && !gs.some((g) => hasFloat(g, env));
  const lins = gs.map((g) => linOf(g, vars, env));
  if (lins.every((l): l is Lin => l !== null))
    return applyConstraints(
      solveLinearSystem(lins, vars, dims, exact && lins.every((l) => l.c.e && l.a.every((a) => a.e))),
      env,
    );
  if (gs.length !== vars.length) throw new EvalError("Nonlinear systems need as many equations as unknowns");
  const fs = gs.map((g) => makeF(g, vars, dims, env));
  const guess = guesses.size ? vars.map((v) => guesses.get(v) ?? 1) : undefined;
  let sols = newtonSystem(fs, vars.length, guess);
  sols = sols.filter((s) =>
    satisfiesConstraints(new Map(vars.map((v, i) => [v, q(N.fl(s[i]), dims[i])] as [string, Value])), env),
  );
  if (!sols.length) return { type: "bool", value: false };
  sols.sort((a, b) => {
    for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 1e-9) return a[i] - b[i];
    return 0;
  });
  if (sols.length > MAX_SHOWN) {
    sols = sols.slice(0, MAX_SHOWN);
    env.notes?.push(`Showing ${MAX_SHOWN} solutions`);
  }
  return joinWith(
    "or",
    sols.map((s) =>
      joinWith(
        "and",
        vars.map((v, i) => eqNode(v, rootsFromFloats([s[i]], exact)[0], dims[i])),
      ),
    ),
  );
}

// ---------------------------------------------------------------- entry points

function problemFrom(call: Call, env: Env): Problem {
  if (!call.args.length) throw new EvalError(`${call.name}() needs an equation`);
  const eqs = collectEquations(call.args[0]);
  const guess = new Map<string, number>();
  const varArgs = call.name === "nsolve" ? call.args.slice(1, 2) : call.args.slice(1);
  const vars =
    varArgs.length > 1
      ? varArgs.flatMap((a) => collectVars(a, eqs, env, guess))
      : collectVars(varArgs[0], eqs, env, guess);
  return { eqs, vars, guess };
}

function nSolve(call: Call, env: Env): Value {
  const { eqs, vars, guess } = problemFrom(call, env);
  if (vars.length !== 1 || eqs.length !== 1) {
    const node = solveSystem(eqs as Extract<Node, { type: "rel" }>[], vars, env, guess ?? new Map());
    return { k: "expr", node: approxDeep(node) };
  }
  const x = vars[0];
  const rel = eqs[0] as Extract<Node, { type: "rel" }>;
  if (rel.op !== "=") throw new EvalError("nSolve() needs an equation");
  const g = difference(rel);
  const [dim] = inferDims([g], [x], env);
  const f1 = makeF(g, [x], [dim], env);
  const f = (t: number) => f1([t]);
  let [lo, hi] = boundsFromConstraints(x, dim, env);
  if (call.args.length >= 4) {
    const a = evaluate(call.args[2], env),
      b = evaluate(call.args[3], env);
    if (a.k === "q") lo = Math.max(lo, N.toF(a.num));
    if (b.k === "q") hi = Math.min(hi, N.toF(b.num));
  }
  const g0 = guess?.get(x) ?? 0;
  const roots = scanRoots(f, lo, hi).roots.filter((r) => satisfiesConstraints(new Map([[x, q(N.fl(r), dim)]]), env));
  if (!roots.length) throw new EvalError("No solution found");
  roots.sort((a, b) => Math.abs(a - g0) - Math.abs(b - g0));
  return q(N.fl(roots[0]), dim);
}

function approxDeep(n: Node): Node {
  if (n.type === "num") return { type: "num", value: N.toFloat(n.value) };
  return mapChildren(n, approxDeep);
}

export function solve(call: Call, env: Env): Value {
  if (call.name === "nsolve") return nSolve(call, env);
  const { eqs, vars, guess } = problemFrom(call, env);
  const expanded = eqs.map((e) => expandFuncs(e, env) as Extract<Node, { type: "rel" }>);
  // Unknown letters besides the solve variables: solve symbolically, like the Nspire CAS.
  const others = freeVars({ type: "list", items: expanded }, env).filter((v) => !vars.includes(v));
  if (others.length) {
    const node = solveSymbolic(expanded, vars, env, call.name === "zeros");
    return { k: "expr", node: call.name === "zeros" ? node : applyConstraints(node, env) };
  }

  if (vars.length === 1 && expanded.length === 1) {
    const x = vars[0];
    const rel = expanded[0];
    const g = difference(rel);
    const [dim] = inferDims([g], [x], env);
    if (rel.op !== "=") {
      if (call.name === "zeros") throw new EvalError("zeros() needs an expression");
      return { k: "expr", node: solveInequality(rel, x, dim, env) };
    }
    const res = solveSingle(g, x, dim, env);
    if (res.truncated) env.notes?.push(`Showing the ${MAX_SHOWN} solutions nearest 0 (there may be infinitely many)`);
    if (call.name === "zeros") {
      if (res.all) throw new EvalError("Every value is a zero");
      if (res.period) env.notes?.push(`Zeros repeat with period ${N.toF(N.fl(res.period.v)).toPrecision(6)}`);
      return { k: "expr", node: { type: "list", items: res.roots.map((r) => valueNode(r, dim)) } };
    }
    if (res.all) return { k: "expr", node: { type: "bool", value: true } };
    if (res.period) {
      env.notes?.push("n1 is any integer");
      return {
        k: "expr",
        node: joinWith(
          "or",
          res.roots.map((r) => periodicNode(x, r, res.period!)),
        ),
      };
    }
    if (!res.roots.length) return { k: "expr", node: { type: "bool", value: false } };
    return {
      k: "expr",
      node: joinWith(
        "or",
        res.roots.map((r) => eqNode(x, r, dim)),
      ),
    };
  }
  if (call.name === "zeros") throw new EvalError("zeros() takes one expression and one variable");
  const node = solveSystem(expanded, vars, env, guess ?? new Map());
  return { k: "expr", node };
}

function solveSymbolic(eqs: Extract<Node, { type: "rel" }>[], vars: string[], env: Env, zeros: boolean): Node {
  const alg = new Algebra(env, new Set(vars));
  if (eqs.some((e) => e.op !== "=")) throw new EvalError("Inequalities with unknown parameters are not supported");
  if (vars.length === 1 && eqs.length === 1) {
    const x = vars[0];
    const sols = symbolicRoots(alg, eqs[0], x);
    if (sols === true) {
      if (zeros) throw new EvalError("Every value is a zero");
      return { type: "bool", value: true };
    }
    if (zeros) return { type: "list", items: sols };
    if (!sols.length) return { type: "bool", value: false };
    return joinWith(
      "or",
      sols.map((s) => ({ type: "rel", op: "=", l: { type: "var", name: x }, r: s }) as Node),
    );
  }
  if (zeros) throw new EvalError("zeros() takes one expression and one variable");
  // Linear system with symbolic coefficients: Gauss-Jordan over fractions.
  const rows = eqs.map((e) => alg.linearRow(alg.from(difference(e)), vars));
  if (rows.some((r) => !r)) throw new EvalError("Only linear systems can be solved with unknown parameters");
  const n = vars.length;
  const M = rows.map((r) => [...r!.a, alg.neg(r!.c)]);
  const pivots: number[] = [];
  let row = 0;
  for (let col = 0; col < n && row < M.length; col++) {
    const p = M.findIndex((r, i) => i >= row && !isZeroFrac(r[col]));
    if (p < 0) continue;
    [M[row], M[p]] = [M[p], M[row]];
    const pv = M[row][col];
    M[row] = M[row].map((x) => alg.div(x, pv));
    for (let r = 0; r < M.length; r++) {
      if (r === row || isZeroFrac(M[r][col])) continue;
      const f = M[r][col];
      M[r] = M[r].map((x, k) => alg.sub(x, alg.mul(f, M[row][k])));
    }
    pivots.push(col);
    row++;
  }
  for (let r = row; r < M.length; r++) if (!isZeroFrac(M[r][n])) return { type: "bool", value: false };
  if (pivots.length < n) throw new EvalError("Infinitely many solutions (underdetermined system)");
  return joinWith(
    "and",
    vars.map(
      (v, i) => ({ type: "rel", op: "=", l: { type: "var", name: v }, r: alg.toNode(M[pivots.indexOf(i)][n]) }) as Node,
    ),
  );
}

/** Roots of one equation in x with symbolic coefficients; `true` if every x works. */
function symbolicRoots(alg: Algebra, rel: Extract<Node, { type: "rel" }>, x: string): Node[] | true {
  const fr = alg.from(difference(rel));
  if (isZeroFrac(fr)) return true;
  const out: Node[] = [];
  const push = (f: Frac) => {
    const node = alg.toNode(f);
    const key = JSON.stringify(node, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
    if (!out.some((o) => JSON.stringify(o, (_k, v) => (typeof v === "bigint" ? v.toString() : v)) === key))
      out.push(node);
  };
  const co = alg.coefficients(fr, x);
  if (co) {
    const terms = [...co.values()].filter((t) => !isZeroFrac(t.c));
    const withX = terms.filter((t) => !N.isZero(t.e));
    const B = terms.find((t) => N.isZero(t.e))?.c ?? fracOf(N.ZERO);
    if (!withX.length) return [];
    if (withX.length === 1) {
      const { e, c: A } = withX[0];
      const rhs = alg.div(alg.neg(B), A);
      if (isZeroFrac(rhs)) {
        push(fracOf(N.ZERO));
        return out;
      }
      const even = e.e && e.d === 1n && e.n % 2n === 0n;
      const root = alg.powRational(rhs, N.div(N.ONE, e), even);
      if (even) push(alg.neg(root));
      push(root);
      return out;
    }
    const exps = withX.map((t) => N.toF(t.e)).sort();
    if (withX.length === 2 && exps[0] === 1 && exps[1] === 2) {
      const A = withX.find((t) => N.toF(t.e) === 2)!.c,
        Bq = withX.find((t) => N.toF(t.e) === 1)!.c;
      const disc = alg.sub(alg.mul(Bq, Bq), alg.mul(fracOf(N.int(4)), alg.mul(A, B)));
      const twoA = alg.mul(fracOf(N.int(2)), A);
      if (isZeroFrac(disc)) {
        push(alg.div(alg.neg(Bq), twoA));
        return out;
      }
      const sq = alg.powRational(disc, N.rat(1n, 2n), true);
      push(alg.div(alg.sub(alg.neg(Bq), sq), twoA));
      push(alg.div(alg.add(alg.neg(Bq), sq), twoA));
      return out;
    }
  }
  const has = (n: Node) => containsVar(n, new Set([x]));
  const iso =
    has(rel.l) && !has(rel.r)
      ? isolate(rel.l, rel.r, x)
      : has(rel.r) && !has(rel.l)
        ? isolate(rel.r, rel.l, x)
        : isolate({ type: "sub", l: rel.l, r: rel.r }, { type: "num", value: N.ZERO }, x);
  if (!iso) throw new EvalError(`Unable to isolate ${x}`);
  for (const b of iso) push(alg.from(b));
  return out;
}

setSolveHook(solve);
