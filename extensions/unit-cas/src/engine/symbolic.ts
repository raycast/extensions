// A small computer-algebra layer: expressions with unknown symbols are normalized to
// fractions of polynomials over "atoms" (variables, units, π, and opaque function calls).
// This powers symbolic solve(), d(), expand() and simplification of expressions with free variables.

import { Node, containsVar, mapChildren, walk } from "./ast";
import { AngleMode, Env, EvalError, evaluate, lookupVar } from "./evaluate";
import { toNspire, valueToNode } from "./format";
import * as N from "./num";
import { Num } from "./num";
import { hasFloat, recognize } from "./solve";
import { isDimless, lookupNspire } from "./units";

type Factors = Map<string, Num>; // atom key -> positive rational exponent
interface Mono {
  c: Num;
  f: Factors;
}
type Poly = Map<string, Mono>;
export interface Frac {
  n: Poly;
  d: Poly;
}

interface Atom {
  node: Node;
  sort: string;
}

const ONE_POLY = (): Poly => new Map([["", { c: N.ONE, f: new Map() }]]);

function monoKey(f: Factors): string {
  return [...f.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, e]) => `${k}^${N.toF(e)}`)
    .join("·");
}

function addMono(p: Poly, m: Mono) {
  const k = monoKey(m.f);
  const ex = p.get(k);
  if (!ex) {
    if (!N.isZero(m.c)) p.set(k, { c: m.c, f: new Map(m.f) });
    return;
  }
  const c = N.add(ex.c, m.c);
  if (N.isZero(c) || (!c.e && Math.abs(c.v) < 1e-14 * Math.max(Math.abs(N.toF(ex.c)), Math.abs(N.toF(m.c)))))
    p.delete(k);
  else p.set(k, { c, f: ex.f });
}

function pAdd(a: Poly, b: Poly): Poly {
  const r: Poly = new Map();
  a.forEach((m) => addMono(r, m));
  b.forEach((m) => addMono(r, m));
  return r;
}
function pScale(a: Poly, k: Num): Poly {
  const r: Poly = new Map();
  a.forEach((m) => addMono(r, { c: N.mul(m.c, k), f: m.f }));
  return r;
}
function mMul(a: Mono, b: Mono): Mono {
  const f = new Map(a.f);
  b.f.forEach((e, k) => {
    const s = N.add(f.get(k) ?? N.ZERO, e);
    if (N.isZero(s)) f.delete(k);
    else f.set(k, s);
  });
  return { c: N.mul(a.c, b.c), f };
}
function pMul(a: Poly, b: Poly): Poly {
  const r: Poly = new Map();
  a.forEach((x) => b.forEach((y) => addMono(r, mMul(x, y))));
  return r;
}
function pConst(p: Poly): Num | null {
  if (p.size === 0) return N.ZERO;
  if (p.size === 1 && p.has("")) return p.get("")!.c;
  return null;
}
function pEq(a: Poly, b: Poly): boolean {
  if (a.size !== b.size) return false;
  for (const [k, m] of a) {
    const o = b.get(k);
    if (!o || !N.approxEq(o.c, m.c)) return false;
  }
  return true;
}

export const isZeroFrac = (f: Frac) => f.n.size === 0;

/** Lexicographic leading monomial (integer exponents only). */
function leading(p: Poly): Mono | null {
  let best: Mono | null = null;
  const cmpMono = (a: Mono, b: Mono) => {
    const keys = [...new Set([...a.f.keys(), ...b.f.keys()])].sort();
    for (const k of keys) {
      const d = N.toF(a.f.get(k) ?? N.ZERO) - N.toF(b.f.get(k) ?? N.ZERO);
      if (d !== 0) return d;
    }
    return 0;
  };
  for (const m of p.values()) {
    for (const e of m.f.values()) if (!e.e || e.d !== 1n) return null;
    if (!best || cmpMono(m, best) > 0) best = m;
  }
  return best;
}

/** n / d when d divides n exactly (multivariate long division), else null. */
function divideExact(n: Poly, d: Poly): Poly | null {
  const ld = leading(d);
  if (!ld || d.size < 2) return null;
  let rem: Poly = new Map(n);
  const q: Poly = new Map();
  for (let guard = 0; rem.size && guard < 200; guard++) {
    const lr = leading(rem);
    if (!lr) return null;
    const f = new Map<string, Num>();
    for (const [k, e] of lr.f) {
      const s = N.sub(e, ld.f.get(k) ?? N.ZERO);
      if (N.sign(s) < 0) return null;
      if (!N.isZero(s)) f.set(k, s);
    }
    for (const k of ld.f.keys()) if (!lr.f.has(k)) return null;
    const t: Mono = { c: N.div(lr.c, ld.c), f };
    addMono(q, t);
    const sub: Poly = new Map();
    d.forEach((m) => addMono(sub, mMul(m, { c: N.neg(t.c), f })));
    rem = pAdd(rem, sub);
  }
  return rem.size ? null : q;
}

/** An exact rational with an even numerator and odd denominator, e.g. 2 or 2/3. */
function isEvenRational(e: Num): boolean {
  return e.e && e.n % 2n === 0n && e.d % 2n === 1n;
}

function constFrac(c: Num): Frac {
  const n: Poly = new Map();
  addMono(n, { c, f: new Map() });
  return { n, d: ONE_POLY() };
}

export class Algebra {
  private atoms = new Map<string, Atom>();

  /** `symbols` are kept symbolic even if a variable of that name is stored. */
  constructor(
    private env: Env,
    private symbols: Set<string> = new Set(),
  ) {}

  // ------------------------------------------------------------ fractions

  add(a: Frac, b: Frac): Frac {
    if (pEq(a.d, b.d)) return this.norm({ n: pAdd(a.n, b.n), d: a.d });
    return this.norm({ n: pAdd(pMul(a.n, b.d), pMul(b.n, a.d)), d: pMul(a.d, b.d) });
  }
  neg(a: Frac): Frac {
    return { n: pScale(a.n, N.int(-1)), d: a.d };
  }
  sub(a: Frac, b: Frac): Frac {
    return this.add(a, this.neg(b));
  }
  mul(a: Frac, b: Frac): Frac {
    return this.norm({ n: pMul(a.n, b.n), d: pMul(a.d, b.d) });
  }
  div(a: Frac, b: Frac): Frac {
    if (isZeroFrac(b)) throw new EvalError("Division by zero");
    return this.norm({ n: pMul(a.n, b.d), d: pMul(a.d, b.n) });
  }
  powInt(a: Frac, k: number): Frac {
    let r = constFrac(N.ONE);
    const base = k < 0 ? this.div(constFrac(N.ONE), a) : a;
    for (let i = 0; i < Math.abs(k); i++) r = this.mul(r, base);
    return r;
  }

  /** Cancels common monomial factors and constant denominators. */
  norm(fr: Frac): Frac {
    let { n, d } = fr;
    if (n.size === 0) return { n: new Map(), d: ONE_POLY() };
    // Common monomial factor of every term in n and d.
    const all = [...n.values(), ...d.values()];
    const common: Factors = new Map();
    all[0].f.forEach((e, k) => {
      let min = e;
      for (const m of all) {
        const x = m.f.get(k);
        if (!x) return;
        if (N.cmp(x, min) < 0) min = x;
      }
      common.set(k, min);
    });
    if (common.size) {
      const strip = (p: Poly): Poly => {
        const r: Poly = new Map();
        p.forEach((m) => {
          const f = new Map(m.f);
          common.forEach((e, k) => {
            const s = N.sub(f.get(k)!, e);
            if (N.isZero(s)) f.delete(k);
            else f.set(k, s);
          });
          addMono(r, { c: m.c, f });
        });
        return r;
      };
      n = strip(n);
      d = strip(d);
    }
    const dc = pConst(d);
    if (dc !== null) return { n: pScale(n, N.div(N.ONE, dc)), d: ONE_POLY() };
    const quot = divideExact(n, d);
    if (quot) return { n: quot, d: ONE_POLY() };
    if (d.size === 1) {
      const m = [...d.values()][0];
      if (m.c.e && !(m.c.n === 1n && m.c.d === 1n)) {
        const k = N.div(N.ONE, m.c);
        n = pScale(n, k);
        d = pScale(d, k);
      }
    }
    // n = k·d
    if (n.size === d.size) {
      let k: Num | null = null;
      let prop = true;
      for (const [key, m] of n) {
        const o = d.get(key);
        if (!o) {
          prop = false;
          break;
        }
        const r = N.div(m.c, o.c);
        if (k && !N.approxEq(k, r)) {
          prop = false;
          break;
        }
        k = r;
      }
      if (prop && k) return constFrac(k);
    }
    // Keep the denominator's leading coefficient positive.
    const lead = this.sortedMonos(d)[0];
    if (lead && N.sign(lead.c) < 0) {
      n = pScale(n, N.int(-1));
      d = pScale(d, N.int(-1));
    }
    return { n, d };
  }

  // ------------------------------------------------------------ atoms

  private atomFrac(node: Node, exp: Num = N.ONE): Frac {
    let key: string, sort: string;
    if (node.type === "var") {
      key = node.name;
      sort = "1" + node.name;
    } else if (node.type === "const") {
      key = "#" + node.name;
      sort = "0" + node.name;
    } else if (node.type === "unit") {
      key = "_" + node.name;
      sort = "3" + node.name;
    } else {
      key = "§" + toNspire(node, { digits: 0 });
      let numeric = true;
      walk(node, (x) => {
        if (x.type === "var" || x.type === "unit") numeric = false;
      });
      sort = (numeric ? "0" : "2") + key;
    }
    if (!this.atoms.has(key)) this.atoms.set(key, { node, sort });
    const n: Poly = new Map();
    addMono(n, { c: N.ONE, f: new Map([[key, exp]]) });
    return { n, d: ONE_POLY() };
  }

  atomNodes(): Node[] {
    return [...this.atoms.values()].map((a) => a.node);
  }

  /** Atoms of a fraction that mention variable x other than x itself. */
  hasOpaque(fr: Frac, x: string): boolean {
    const keys = new Set<string>();
    for (const p of [fr.n, fr.d]) p.forEach((m) => m.f.forEach((_, k) => keys.add(k)));
    for (const k of keys) {
      if (k === x) continue;
      const a = this.atoms.get(k);
      if (a && containsVar(a.node, new Set([x]))) return true;
    }
    return false;
  }

  // ------------------------------------------------------------ conversion

  private isNumeric(node: Node): boolean {
    let ok = true;
    walk(node, (x) => {
      if (x.type === "var" && (this.symbols.has(x.name) || !lookupVar(x.name, this.env))) ok = false;
      if (x.type === "unit") ok = false;
      if (x.type === "call" && this.env.funcs.has(x.name)) ok = false;
    });
    return ok;
  }

  private numericFrac(node: Node): Frac | null {
    if (!this.isNumeric(node)) return null;
    const v = evaluate(node, this.env);
    if (v.k !== "q") return null;
    if (!v.num.e && this.env.settings.mode !== "approx" && !hasFloat(node, this.env) && isDimless(v.dim)) {
      const ex = recognize(v.num.v);
      if (ex && ex.type === "num") return constFrac(ex.value);
      if (ex) return this.atomFrac(ex);
    }
    return this.from(valueToNode(v, { ...this.env.settings, mode: "exact" }));
  }

  from(node: Node): Frac {
    switch (node.type) {
      case "num":
        return constFrac(node.value);
      case "var": {
        if (!this.symbols.has(node.name)) {
          const v = lookupVar(node.name, this.env);
          if (v?.k === "q") return this.from(valueToNode(v, { ...this.env.settings, mode: "exact" }));
          if (v?.k === "expr") return this.from(v.node);
          if (v) throw new EvalError(`Cannot use ${node.name} in algebra`);
        }
        return this.atomFrac(node);
      }
      case "unit":
      case "const":
        if (node.type === "const" && node.name === "∞") throw new EvalError("∞ is not supported here");
        return this.atomFrac(node);
      case "add":
        return this.add(this.from(node.l), this.from(node.r));
      case "sub":
        return this.sub(this.from(node.l), this.from(node.r));
      case "mul":
        return this.mul(this.from(node.l), this.from(node.r));
      case "div":
        return this.div(this.from(node.l), this.from(node.r));
      case "neg":
        return this.neg(this.from(node.arg));
      case "pct":
        return this.div(this.from(node.arg), constFrac(N.int(100)));
      case "pow":
        return this.pow(node.l, node.r);
      case "call":
        return this.call(node);
      case "with":
        throw new EvalError("Unexpected | inside an expression");
      default: {
        const nf = this.numericFrac(node);
        if (nf) return nf;
        throw new EvalError("Cannot simplify this expression symbolically");
      }
    }
  }

  private exponentValue(e: Node): Num | null {
    if (!this.isNumeric(e)) return null;
    const v = evaluate(e, this.env);
    return v.k === "q" ? v.num : null;
  }

  private pow(baseNode: Node, expNode: Node): Frac {
    const k = this.exponentValue(expNode);
    const base = this.from(baseNode);
    if (k && k.e) {
      if (k.d === 1n && k.n >= -24n && k.n <= 24n) return this.powInt(base, Number(k.n));
      return this.powRational(base, k);
    }
    const bc = pConst(base.n);
    if (bc && N.isZero(bc)) return constFrac(N.ZERO);
    return this.atomFrac({ type: "pow", l: this.toNode(base), r: this.simplifyNode(expNode) });
  }

  /**
   * Raises a fraction to a non-integer rational power; monomials keep their structure (√(a²b) = |a|√b).
   * `signFree` drops the absolute values when the caller takes ± of the result anyway (roots of x² = a²).
   */
  powRational(base: Frac, r: Num, signFree = false): Frac {
    if (r.e && r.d === 1n && r.n >= -24n && r.n <= 24n) return this.powInt(base, Number(r.n));
    if (N.sign(r) < 0) return this.div(constFrac(N.ONE), this.powRational(base, N.neg(r), signFree));
    const monoPow = (p: Poly): Frac | null => {
      if (p.size !== 1) return null;
      const m = [...p.values()][0];
      let out = this.coefPow(m.c, r);
      if (!out) return null;
      const f: Factors = new Map();
      for (const [k, e] of m.f) {
        const er = N.mul(e, r);
        // (x^2)^(1/2) = |x|: an even power of a possibly negative atom keeps its sign only if the result is even too.
        if (!signFree && this.maybeNegative(k) && isEvenRational(e) && !isEvenRational(er)) {
          out = this.mul(out, this.atomFrac({ type: "call", name: "abs", args: [this.atoms.get(k)!.node] }, er));
        } else f.set(k, er);
      }
      const n: Poly = new Map();
      addMono(n, { c: N.ONE, f });
      out = this.mul(out, { n, d: ONE_POLY() });
      return out;
    };
    const top = monoPow(base.n),
      bottom = monoPow(base.d);
    if (top && bottom) return this.div(top, bottom);
    if (bottom && !top) {
      // (P/m)^r = P^r / m^r with P^r opaque
      return this.div(this.opaquePow(base.n, r), bottom);
    }
    return this.opaquePow(base.n, r, base.d);
  }

  /** Whether an atom may take negative values (variables and most calls; not π, units or abs()). */
  private maybeNegative(key: string): boolean {
    if (key.startsWith("#") || key.startsWith("_")) return false;
    const node = this.atoms.get(key)?.node;
    return !(node?.type === "call" && (node.name === "abs" || node.name === "sqrt" || node.name === "exp"));
  }

  private opaquePow(n: Poly, r: Num, d?: Poly): Frac {
    const inner = this.toNode({ n, d: d ?? ONE_POLY() });
    const node: Node =
      r.e && r.n === 1n && r.d === 2n
        ? { type: "call", name: "sqrt", args: [inner] }
        : { type: "pow", l: inner, r: { type: "num", value: r } };
    return this.atomFrac(node);
  }

  /** c^r for a numeric coefficient, pulling out perfect powers (8^(1/2) = 2·√2). */
  private coefPow(c: Num, r: Num): Frac | null {
    const exact = N.pow(c, r);
    if (exact.e) return constFrac(exact);
    if (!c.e || !r.e) return Number.isNaN(N.toF(exact)) ? null : constFrac(exact);
    if (N.sign(c) < 0 && r.d % 2n === 0n) return null;
    const q = Number(r.d);
    // c = a/b: pull k^q out of a·b^(q-1) over b
    const neg = c.n < 0n;
    const a = neg ? -c.n : c.n;
    let rest = a * c.d ** BigInt(q - 1);
    let k = 1n;
    for (let p = 2n; p ** BigInt(q) <= rest && p < 100000n; p++) {
      const pq = p ** BigInt(q);
      while (rest % pq === 0n) {
        rest /= pq;
        k *= p;
      }
    }
    // c^(1/q) = k·rest^(1/q)/b
    let res = constFrac(N.rat(neg ? -k : k, c.d));
    if (rest !== 1n) {
      const rn: Node = { type: "num", value: N.rat(rest) };
      const atom: Node =
        q === 2
          ? { type: "call", name: "sqrt", args: [rn] }
          : { type: "call", name: "root", args: [rn, { type: "num", value: N.int(q) }] };
      res = this.mul(res, this.atomFrac(atom));
    }
    if (r.n !== 1n) res = this.powInt(res, Number(r.n));
    return res;
  }

  private call(node: Extract<Node, { type: "call" }>): Frac {
    const uf = this.env.funcs.get(node.name);
    if (uf && uf.params.length === node.args.length) {
      return this.from(substitute(uf.body, new Map(uf.params.map((p, i) => [p, node.args[i]] as [string, Node]))));
    }
    if (node.name === "sqrt" && node.args.length === 1) return this.powRational(this.from(node.args[0]), N.rat(1n, 2n));
    if (node.name === "root" && node.args.length === 2) {
      const k = this.exponentValue(node.args[1]);
      if (k && k.e) return this.powRational(this.from(node.args[0]), N.div(N.ONE, k));
    }
    if (node.name === "expand" && node.args.length >= 1) return this.from(node.args[0]);
    if (node.name === "d" || node.name === "derivative") {
      const [expr, v, k] = node.args;
      if (!v || v.type !== "var") throw new EvalError("d(expression, variable) needs a variable");
      const kv = k ? this.exponentValue(k) : N.ONE;
      if (!kv || !kv.e || kv.d !== 1n || kv.n < 0n) throw new EvalError("d(): the order must be a whole number");
      const inner = new Algebra(this.env, new Set([...this.symbols, v.name]));
      return this.from(inner.toNode(inner.from(nthDerivative(expr, v.name, Number(kv.n), this.env))));
    }
    const nf = this.numericFrac(node);
    if (nf) return nf;
    if (node.name === "exp" && node.args.length === 1)
      return this.atomFrac({ type: "pow", l: { type: "const", name: "e" }, r: this.simplifyNode(node.args[0]) });
    return this.atomFrac({ ...node, args: node.args.map((a) => this.simplifyNode(a)) });
  }

  simplifyNode(n: Node): Node {
    try {
      return this.toNode(this.from(n));
    } catch {
      return n;
    }
  }

  // ------------------------------------------------------------ back to nodes

  private sortedMonos(p: Poly): Mono[] {
    const deg = (m: Mono) => [...m.f.values()].reduce((a, e) => a + N.toF(e), 0);
    const first = (m: Mono) =>
      [...m.f.keys()]
        .map((k) => this.atoms.get(k)?.sort ?? k)
        .sort()
        .join(",");
    return [...p.values()].sort((a, b) => {
      if (a.f.size === 0) return 1;
      if (b.f.size === 0) return -1;
      const fa = first(a),
        fb = first(b);
      // Group by the leading symbol, highest power first (a*x^2+b*x+c).
      const da = deg(a),
        db = deg(b);
      if (fa.split(",")[0] === fb.split(",")[0] && da !== db) return db - da;
      return fa < fb ? -1 : fa > fb ? 1 : db - da;
    });
  }

  private factorNode(key: string, e: Num): Node {
    const atom = this.atoms.get(key)!.node;
    if (N.cmp(e, N.ONE) === 0) return atom;
    if (e.e && e.n === 1n && e.d === 2n) return { type: "call", name: "sqrt", args: [atom] };
    const en: Node =
      e.e && e.d !== 1n
        ? { type: "div", l: { type: "num", value: N.rat(e.n) }, r: { type: "num", value: N.rat(e.d) } }
        : { type: "num", value: e };
    return { type: "pow", l: atom, r: en };
  }

  private factorList(m: Mono): Node[] {
    const keys = [...m.f.keys()].sort((a, b) => {
      const sa = this.atoms.get(a)!.sort,
        sb = this.atoms.get(b)!.sort;
      return sa < sb ? -1 : sa > sb ? 1 : 0;
    });
    return keys.map((k) => this.factorNode(k, m.f.get(k)!));
  }

  private chain(xs: Node[]): Node {
    return xs.reduce((a, b) => ({ type: "mul", l: a, r: b }));
  }

  /** Product of the factors of a monomial, numeric coefficient handled by the caller. */
  private factorsNode(m: Mono): Node | null {
    const xs = this.factorList(m);
    return xs.length ? this.chain(xs) : null;
  }

  /** Monomial with |coefficient|; returns sign separately. */
  private monoNode(m: Mono): { node: Node; negative: boolean } {
    const negative = N.sign(m.c) < 0;
    const c = negative ? N.neg(m.c) : m.c;
    const fac = this.factorsNode(m);
    if (!fac) return { node: { type: "num", value: c }, negative };
    const withCoef = (k: Node): Node => this.chain([k, ...this.factorList(m)]);
    if (c.e) {
      const top: Node = c.n === 1n ? fac : withCoef({ type: "num", value: N.rat(c.n) });
      return { node: c.d === 1n ? top : { type: "div", l: top, r: { type: "num", value: N.rat(c.d) } }, negative };
    }
    return { node: c.v === 1 ? fac : withCoef({ type: "num", value: c }), negative };
  }

  polyNode(p: Poly): Node {
    if (p.size === 0) return { type: "num", value: N.ZERO };
    let out: Node | null = null;
    const monos = this.sortedMonos(p);
    // Avoid a leading minus: b^2-4*a*c rather than -4*a*c+b^2.
    if (N.sign(monos[0].c) < 0) {
      const i = monos.findIndex((m) => N.sign(m.c) > 0 && m.f.size > 0);
      const j = i >= 0 ? i : monos.findIndex((m) => N.sign(m.c) > 0);
      if (j > 0) monos.unshift(...monos.splice(j, 1));
    }
    for (const m of monos) {
      const { node, negative } = this.monoNode(m);
      if (!out) out = negative ? { type: "neg", arg: node } : node;
      else out = negative ? { type: "sub", l: out, r: node } : { type: "add", l: out, r: node };
    }
    return out!;
  }

  toNode(fr: Frac): Node {
    let n = fr.n,
      d = fr.d;
    if (n.size > 1) {
      let L = 1n;
      n.forEach((m) => {
        if (m.c.e) L = (L / N.bgcd(L, m.c.d)) * m.c.d;
      });
      if (L > 1n) {
        n = pScale(n, N.rat(L));
        d = pScale(d, N.rat(L));
      }
    }
    if (pConst(d) !== null && N.cmp(pConst(d)!, N.ONE) === 0) return this.polyNode(n);
    // Move a single monomial's rational coefficient denominator below the bar: (3*a)/(2*b)
    if (n.size === 1) {
      const m = [...n.values()][0];
      if (m.c.e && m.c.d !== 1n) {
        const k = N.rat(m.c.d);
        n = pScale(n, k);
        d = pScale(d, k);
      }
    }
    const top = this.polyNode(n);
    const bottom = this.polyNode(d);
    if (top.type === "neg") return { type: "neg", arg: { type: "div", l: top.arg, r: bottom } };
    return { type: "div", l: top, r: bottom };
  }

  // ------------------------------------------------------------ polynomial view in one symbol

  /** Coefficients of n by power of x, or null if x appears other than as x^k. */
  coefficients(fr: Frac, x: string): Map<string, { e: Num; c: Frac }> | null {
    if (this.hasOpaque(fr, x)) return null;
    for (const m of fr.d.values()) if (m.f.has(x)) return null;
    const out = new Map<string, { e: Num; c: Frac }>();
    fr.n.forEach((m) => {
      const e = m.f.get(x) ?? N.ZERO;
      const f = new Map(m.f);
      f.delete(x);
      const key = `${N.toF(e)}`;
      const n: Poly = new Map();
      addMono(n, { c: m.c, f });
      const prev = out.get(key);
      const c: Frac = { n, d: ONE_POLY() };
      out.set(key, { e, c: prev ? this.add(prev.c, c) : c });
    });
    return out;
  }

  /** Numerator monomials split into those containing given symbols (for linear systems). */
  linearRow(fr: Frac, vars: string[]): { a: Frac[]; c: Frac } | null {
    const set = new Set(vars);
    for (const v of vars) if (this.hasOpaque(fr, v)) return null;
    for (const m of fr.d.values()) for (const v of vars) if (m.f.has(v)) return null;
    const a = vars.map(() => constFrac(N.ZERO));
    let c = constFrac(N.ZERO);
    for (const m of fr.n.values()) {
      const present = [...m.f.keys()].filter((k) => set.has(k));
      const f = new Map(m.f);
      const n: Poly = new Map();
      if (present.length === 0) {
        addMono(n, m);
        c = this.add(c, { n, d: ONE_POLY() });
        continue;
      }
      if (present.length > 1 || N.cmp(m.f.get(present[0])!, N.ONE) !== 0) return null;
      f.delete(present[0]);
      addMono(n, { c: m.c, f });
      const i = vars.indexOf(present[0]);
      a[i] = this.add(a[i], { n, d: ONE_POLY() });
    }
    return { a, c };
  }
}

export const fracOf = (c: Num) => constFrac(c);

// ------------------------------------------------------------ helpers

export function substitute(n: Node, map: Map<string, Node>): Node {
  const rec = (x: Node): Node => {
    switch (x.type) {
      case "var":
        return map.get(x.name) ?? x;
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
        return { ...x, l: rec(x.l), r: rec(x.r) } as Node;
      case "neg":
      case "fact":
      case "pct":
      case "not":
        return { ...x, arg: rec(x.arg) } as Node;
      case "call":
        return { ...x, args: x.args.map(rec) };
      case "list":
        return { ...x, items: x.items.map(rec) };
      default:
        return x;
    }
  };
  return rec(n);
}

export function expandUser(n: Node, env: Env, depth = 0): Node {
  if (depth > 32) return n;
  const rec = (x: Node) => expandUser(x, env, depth + 1);
  if (n.type === "call") {
    const args = n.args.map(rec);
    const uf = env.funcs.get(n.name);
    if (uf && uf.params.length === args.length) {
      return rec(substitute(uf.body, new Map(uf.params.map((p, i) => [p, args[i]] as [string, Node]))));
    }
    return { ...n, args };
  }
  return mapChildren(n, rec);
}

const num = (k: number): Node => ({ type: "num", value: N.int(k) });
const mul = (l: Node, r: Node): Node => ({ type: "mul", l, r });
const div = (l: Node, r: Node): Node => ({ type: "div", l, r });
const sub = (l: Node, r: Node): Node => ({ type: "sub", l, r });
const add = (l: Node, r: Node): Node => ({ type: "add", l, r });
const pw = (l: Node, r: Node): Node => ({ type: "pow", l, r });
const call = (name: string, ...args: Node[]): Node => ({ type: "call", name, args });

/** Radians per plain number in the angle mode, as a node (null in radian mode). */
function angleFactor(angle: AngleMode): Node | null {
  return angle === "rad" ? null : div({ type: "const", name: "π" }, num(angle === "deg" ? 180 : 200));
}

/** Whether a trig argument carries an explicit angle unit (sin(x*_°)), so the angle mode does not apply. */
function hasAngleUnit(n: Node): boolean {
  let found = false;
  walk(n, (x) => {
    if (x.type === "unit" && lookupNspire(x.name)?.angle) found = true;
  });
  return found;
}

/** The order-th derivative of n with respect to x, simplified after each step. */
export function nthDerivative(n: Node, x: string, order: number, env: Env): Node {
  if (order > 64) throw new EvalError("d(): the order is too large");
  let D = expandUser(n, env);
  for (let i = 0; i < order; i++) D = new Algebra(env, new Set([x])).simplifyNode(derivative(D, x, env.settings.angle));
  return D;
}

/**
 * Symbolic derivative of n with respect to x (unsimplified). Trig functions read plain numbers in the
 * angle mode (sin(x) is sin(x·π/180) in degrees), so their derivatives carry that factor.
 */
export function derivative(n: Node, x: string, angle: AngleMode = "rad"): Node {
  const has = (e: Node) => containsVar(e, new Set([x]));
  if (!has(n)) return num(0);
  const D = (e: Node) => derivative(e, x, angle);
  switch (n.type) {
    case "var":
      return num(n.name === x ? 1 : 0);
    case "add":
      return add(D(n.l), D(n.r));
    case "sub":
      return sub(D(n.l), D(n.r));
    case "neg":
      return { type: "neg", arg: D(n.arg) };
    case "pct":
      return div(D(n.arg), num(100));
    case "mul":
      return add(mul(D(n.l), n.r), mul(n.l, D(n.r)));
    case "div":
      return div(sub(mul(D(n.l), n.r), mul(n.l, D(n.r))), pw(n.r, num(2)));
    case "pow":
      if (!has(n.r)) return mul(mul(n.r, pw(n.l, sub(n.r, num(1)))), D(n.l));
      if (!has(n.l)) return mul(mul(n, call("ln", n.l)), D(n.r));
      return mul(n, add(mul(D(n.r), call("ln", n.l)), div(mul(n.r, D(n.l)), n.l)));
    case "call": {
      const u = n.args[0];
      const k = angleFactor(angle);
      // Forward trig: d/dx f(k·u) = k·f'(k·u)·u', unless u carries its own angle unit (sin(x*_°)).
      // Inverse trig always returns angles in the mode, whatever its argument: divide by k.
      const du = ["sin", "cos", "tan"].includes(n.name) && k && !hasAngleUnit(u) ? mul(k, D(u)) : D(u);
      const dinv = (e: Node) => (["arcsin", "arccos", "arctan"].includes(n.name) && k ? div(e, k) : e);
      switch (n.name) {
        case "sin":
          return mul(call("cos", u), du);
        case "cos":
          return { type: "neg", arg: mul(call("sin", u), du) };
        case "tan":
          return div(du, pw(call("cos", u), num(2)));
        case "ln":
          return div(du, u);
        case "log":
          return div(du, mul(u, call("ln", n.args[1] ?? num(10))));
        case "exp":
          return mul(call("exp", u), du);
        case "sqrt":
          return div(du, mul(num(2), call("sqrt", u)));
        case "root":
          return D(pw(u, div(num(1), n.args[1])));
        case "arcsin":
          return dinv(div(du, call("sqrt", sub(num(1), pw(u, num(2))))));
        case "arccos":
          return dinv({ type: "neg", arg: div(du, call("sqrt", sub(num(1), pw(u, num(2))))) });
        case "arctan":
          return dinv(div(du, add(num(1), pw(u, num(2)))));
        case "sinh":
          return mul(call("cosh", u), du);
        case "cosh":
          return mul(call("sinh", u), du);
        case "tanh":
          return div(du, pw(call("cosh", u), num(2)));
        case "abs":
          return mul(call("sign", u), du);
      }
      throw new EvalError(`Cannot differentiate ${n.name}()`);
    }
    default:
      throw new EvalError("Cannot differentiate this expression");
  }
}

/** Isolates x when it occurs once: f(x) = r  ⇒  x = f⁻¹(r). Returns the branches. */
export function isolate(l: Node, r: Node, x: string): Node[] | null {
  const has = (e: Node) => containsVar(e, new Set([x]));
  const both = (a: Node, b: Node) => has(a) && has(b);
  const go = (a: Node, rhs: Node) => isolate(a, rhs, x);
  switch (l.type) {
    case "var":
      return l.name === x ? [r] : null;
    case "add":
      if (both(l.l, l.r)) return null;
      return has(l.l) ? go(l.l, sub(r, l.r)) : go(l.r, sub(r, l.l));
    case "sub":
      if (both(l.l, l.r)) return null;
      return has(l.l) ? go(l.l, add(r, l.r)) : go(l.r, sub(l.l, r));
    case "mul":
      if (both(l.l, l.r)) return null;
      return has(l.l) ? go(l.l, div(r, l.r)) : go(l.r, div(r, l.l));
    case "div":
      if (both(l.l, l.r)) return null;
      return has(l.l) ? go(l.l, mul(r, l.r)) : go(l.r, div(l.l, r));
    case "neg":
      return go(l.arg, { type: "neg", arg: r });
    case "pow":
      if (both(l.l, l.r)) return null;
      if (has(l.l)) {
        const k = l.r.type === "num" ? N.toF(l.r.value) : NaN;
        const root = pw(r, div(num(1), l.r));
        if (Number.isInteger(k) && k % 2 === 0) {
          const a = go(l.l, { type: "neg", arg: root }),
            b = go(l.l, root);
          return a && b ? [...a, ...b] : null;
        }
        return go(l.l, root);
      }
      return go(l.r, div(call("ln", r), call("ln", l.l)));
    case "call": {
      const u = l.args[0];
      if (l.args.slice(1).some(has)) return null;
      const inv: Record<string, (r: Node) => Node> = {
        sqrt: (y) => pw(y, num(2)),
        exp: (y) => call("ln", y),
        ln: (y) => pw({ type: "const", name: "e" }, y),
        log: (y) => pw(l.args[1] ?? num(10), y),
        root: (y) => pw(y, l.args[1]),
        sin: (y) => call("arcsin", y),
        cos: (y) => call("arccos", y),
        tan: (y) => call("arctan", y),
        arcsin: (y) => call("sin", y),
        arccos: (y) => call("cos", y),
        arctan: (y) => call("tan", y),
        sinh: (y) => call("arcsinh", y),
        cosh: (y) => call("arccosh", y),
        tanh: (y) => call("arctanh", y),
      };
      if (l.name === "abs") {
        const a = go(u, { type: "neg", arg: r }),
          b = go(u, r);
        return a && b ? [...a, ...b] : null;
      }
      const f = inv[l.name];
      return f ? go(u, f(r)) : null;
    }
    default:
      return null;
  }
}
