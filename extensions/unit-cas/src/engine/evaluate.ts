import { Node, conjuncts } from "./ast";
import * as N from "./num";
import { Num } from "./num";
import { BASE_COUNT, DIMLESS, Dim, dimDiv, dimEq, dimMul, dimScale, isDimless, lookupNspire } from "./units";

export interface Settings {
  mode: "auto" | "exact" | "approx";
  angle: AngleMode;
  digits: number;
  nspireAscii?: boolean;
}

export type AngleMode = "rad" | "deg" | "grad";

/** Radians per unit of a plain number in each angle mode. */
export const ANGLE_FACTOR: Record<AngleMode, number> = { rad: 1, deg: Math.PI / 180, grad: Math.PI / 200 };

export const DEFAULT_SETTINGS: Settings = { mode: "auto", angle: "rad", digits: 6 };

export type Value =
  | { k: "q"; num: Num; dim: Dim; angle?: boolean; disp?: { unit: Node; num: Num; abs?: boolean } }
  | { k: "list"; items: Value[] }
  | { k: "bool"; v: boolean }
  | { k: "expr"; node: Node };

export type Q = Extract<Value, { k: "q" }>;

export interface UserFunc {
  params: string[];
  body: Node;
}

export interface Env {
  settings: Settings;
  vars: Map<string, Value>;
  funcs: Map<string, UserFunc>;
  locals?: Map<string, Value>;
  /** Conditions from the `|` operator that are not substitutions (e.g. x>0). */
  constraints?: Node[];
  /** Dimension inference pass: mismatches involving unknown slots throw DimConstraint. */
  dimMode?: boolean;
  notes?: string[];
  depth?: number;
}

export class EvalError extends Error {}
export class UndefinedVar extends EvalError {
  constructor(public varName: string) {
    super(`Undefined variable ${varName}`);
  }
}
export class DimConstraint extends Error {
  constructor(public diff: Dim) {
    super("dimension constraint");
  }
}

export const q = (num: Num, dim: Dim = DIMLESS, angle?: boolean): Q => ({ k: "q", num, dim, angle });

export function hasUnknownSlots(d: Dim): boolean {
  for (let i = BASE_COUNT; i < d.length; i++) if (Math.abs(d[i]) > 1e-9) return true;
  return false;
}

function requireSameDim(a: Q, b: Q, env: Env) {
  if (dimEq(a.dim, b.dim)) return;
  const diff = dimDiv(a.dim, b.dim);
  if (env.dimMode && hasUnknownSlots(diff)) throw new DimConstraint(diff);
  throw new EvalError("Incompatible units");
}

function requireDimless(a: Q, env: Env, what: string) {
  if (isDimless(a.dim)) return;
  if (env.dimMode && hasUnknownSlots(a.dim)) throw new DimConstraint(a.dim);
  throw new EvalError(`${what} requires a dimensionless argument`);
}

const isExactZero = (a: Q) => a.num.e && a.num.n === 0n && isDimless(a.dim);

function asQ(v: Value, what = "operation"): Q {
  if (v.k === "q") return v;
  if (v.k === "bool") throw new EvalError(`Cannot use true/false in ${what}`);
  if (v.k === "expr") throw new EvalError(`Cannot use a symbolic result in ${what}`);
  throw new EvalError(`Cannot use a list in ${what}`);
}

/** Applies a binary operation elementwise over lists like the Nspire. */
function lift(a: Value, b: Value, f: (x: Q, y: Q) => Value): Value {
  if (a.k === "list" && b.k === "list") {
    if (a.items.length !== b.items.length) throw new EvalError("Dimension mismatch (list lengths)");
    return { k: "list", items: a.items.map((x, i) => lift(x, b.items[i], f)) };
  }
  if (a.k === "list") return { k: "list", items: a.items.map((x) => lift(x, b, f)) };
  if (b.k === "list") return { k: "list", items: b.items.map((y) => lift(a, y, f)) };
  return f(asQ(a), asQ(b));
}

function lift1(a: Value, f: (x: Q) => Value): Value {
  if (a.k === "list") return { k: "list", items: a.items.map((x) => lift1(x, f)) };
  return f(asQ(a));
}

export function addQ(a: Q, b: Q, env: Env): Q {
  if (isExactZero(a)) return { ...b, disp: undefined };
  if (isExactZero(b)) return { ...a, disp: undefined };
  requireSameDim(a, b, env);
  return q(N.add(a.num, b.num), a.dim, a.angle || b.angle);
}

export function mulQ(a: Q, b: Q): Q {
  const angle = (a.angle && !b.angle) || (b.angle && !a.angle);
  return q(N.mul(a.num, b.num), dimMul(a.dim, b.dim), angle);
}

export function divQ(a: Q, b: Q): Q {
  const angle = a.angle && !b.angle;
  return q(N.div(a.num, b.num), dimDiv(a.dim, b.dim), angle);
}

export function powQ(a: Q, b: Q, env: Env): Q {
  requireDimless(b, env, "Exponent");
  if (isDimless(a.dim)) return q(N.pow(a.num, b.num));
  return q(N.pow(a.num, b.num), dimScale(a.dim, N.toF(b.num)));
}

function snap(x: number): Num {
  return N.fl(Math.abs(x) < 1e-14 ? 0 : x);
}

function angleIn(a: Q, env: Env): number {
  const x = N.toF(a.num);
  return a.angle ? x : x * ANGLE_FACTOR[env.settings.angle];
}

function angleOut(x: number, env: Env): Q {
  return q(N.fl(env.settings.angle === "rad" ? x : x / ANGLE_FACTOR[env.settings.angle]));
}

function intArg(a: Q, what: string): bigint {
  if (!a.num.e || a.num.d !== 1n) {
    const f = N.toF(a.num);
    if (Number.isInteger(f)) return BigInt(f);
    throw new EvalError(`${what} requires integer arguments`);
  }
  return a.num.n;
}

function gamma(x: number): number {
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * a;
}

function factorial(a: Q): Q {
  if (a.num.e && a.num.d === 1n && a.num.n >= 0n && a.num.n <= 5000n) {
    let r = 1n;
    for (let i = 2n; i <= a.num.n; i++) r *= i;
    return q(N.rat(r));
  }
  const x = N.toF(a.num);
  if (x < 0 && Number.isInteger(x)) return q(N.fl(NaN));
  return q(N.fl(gamma(x + 1)));
}

function flatten(args: Value[]): Q[] {
  const out: Q[] = [];
  for (const a of args) {
    if (a.k === "list") out.push(...flatten(a.items));
    else out.push(asQ(a));
  }
  return out;
}

function toApprox(v: Value): Value {
  if (v.k === "q") return { ...v, num: N.toFloat(v.num), disp: v.disp && { ...v.disp, num: N.toFloat(v.disp.num) } };
  if (v.k === "list") return { k: "list", items: v.items.map(toApprox) };
  return v;
}

function toExact(v: Value): Value {
  if (v.k === "q") {
    const r = v.num.e ? v.num : (N.toRat(v.num.v, 1e6) ?? v.num);
    const dr = v.disp && (v.disp.num.e ? v.disp.num : (N.toRat(N.toF(v.disp.num), 1e6) ?? v.disp.num));
    return { ...v, num: r, disp: v.disp && dr ? { ...v.disp, num: dr } : undefined };
  }
  if (v.k === "list") return { k: "list", items: v.items.map(toExact) };
  return v;
}

/** Absolute temperature scales: kelvin = (value + offset) * scale. */
export const TEMP_ABS: Record<string, { scale: Num; offset: Num }> = {
  K: { scale: N.ONE, offset: N.ZERO },
  "°C": { scale: N.ONE, offset: N.parseDecimal("273.15") },
  "°F": { scale: N.rat(5n, 9n), offset: N.parseDecimal("459.67") },
  "°R": { scale: N.rat(5n, 9n), offset: N.ZERO },
};

function tempUnitOf(n: Node): string | undefined {
  if (n.type === "unit") return n.name;
  if (n.type === "mul") return tempUnitOf(n.r) ?? tempUnitOf(n.l);
  if (n.type === "neg") return tempUnitOf(n.arg);
  return undefined;
}

const tempKey = (name: string) => (name === "°K" ? "K" : name);

/**
 * A plain temperature reading (20_°C, -5_°F) is an absolute temperature, so it converts with the scale's offset.
 * Inside larger expressions (20_°C+5_°C, 1_J/_°C) temperatures stay differences.
 */
export function tempReading(n: Node, env: Env): Value | undefined {
  const m = n.type === "neg" ? n.arg : n;
  if (m.type !== "mul" || m.r.type !== "unit" || !(tempKey(m.r.name) in TEMP_ABS)) return undefined;
  const mag = evaluate(m.l, env);
  if (mag.k !== "q" || !isDimless(mag.dim) || mag.angle) return undefined;
  return tmpCnv([n, { type: "unit", name: "K" }], env);
}

function tmpCnv(args: Node[], env: Env): Value {
  if (args.length !== 2) throw new EvalError("tmpCnv(value_°C, _°F) takes 2 arguments");
  const from = tempUnitOf(args[0]),
    to = tempUnitOf(args[1]);
  const fromK = from && tempKey(from),
    toK = to && tempKey(to);
  if (!fromK || !toK || !(fromK in TEMP_ABS) || !(toK in TEMP_ABS)) {
    throw new EvalError("tmpCnv needs temperature units (_°C, _°F, _K, _°R)");
  }
  const src = asQ(evaluate(args[0], env));
  const fromU = lookupNspire(fromK)!;
  const inSrc = N.div(src.num, fromU.factor);
  const kelvin = N.mul(N.add(inSrc, TEMP_ABS[fromK].offset), TEMP_ABS[fromK].scale);
  const out = N.sub(N.div(kelvin, TEMP_ABS[toK].scale), TEMP_ABS[toK].offset);
  const toU = lookupNspire(toK)!;
  return { k: "q", num: kelvin, dim: toU.dim, disp: { unit: args[1], num: out, abs: true } };
}

function convert(v: Value, target: Node, env: Env): Value {
  const t = asQ(evaluate(target, env), "conversion");
  return lift1(v, (a) => {
    if (!dimEq(a.dim, t.dim)) throw new EvalError("Incompatible units in conversion");
    if (a.disp?.abs && target.type === "unit" && tempKey(target.name) in TEMP_ABS) {
      const to = TEMP_ABS[tempKey(target.name)];
      const out = N.sub(N.div(a.num, to.scale), to.offset);
      return { k: "q", num: a.num, dim: a.dim, disp: { unit: target, num: out, abs: true } };
    }
    let num = a.num;
    // A plain number converted to an angle unit is an angle in the current mode.
    if (t.angle && !a.angle && isDimless(a.dim) && env.settings.angle !== "rad") {
      num = N.mul(num, N.fl(ANGLE_FACTOR[env.settings.angle]));
    }
    return { k: "q", num: a.num, dim: a.dim, angle: a.angle, disp: { unit: target, num: N.div(num, t.num) } };
  });
}

export type SolveHook = (call: Extract<Node, { type: "call" }>, env: Env) => Value;
let solveHook: SolveHook | undefined;
export function setSolveHook(h: SolveHook) {
  solveHook = h;
}

/** Extra functions registered by other modules; returning undefined falls through to the built-ins. */
export type FunctionHook = (args: Node[], env: Env) => Value | undefined;
const functionHooks = new Map<string, FunctionHook>();
export function registerFunction(name: string, h: FunctionHook) {
  functionHooks.set(name, h);
}

function callBuiltin(name: string, argNodes: Node[], env: Env): Value {
  const hook = functionHooks.get(name);
  if (hook) {
    const r = hook(argNodes, env);
    if (r) return r;
  }
  if (name === "solve" || name === "csolve" || name === "nsolve" || name === "zeros") {
    if (!solveHook) throw new EvalError("solve is unavailable");
    return solveHook({ type: "call", name, args: argNodes }, env);
  }
  if (name === "tmpcnv") return tmpCnv(argNodes, env);
  if (name === "δtmpcnv") {
    if (argNodes.length !== 2) throw new EvalError("ΔtmpCnv takes 2 arguments");
    return convert(evaluate(argNodes[0], env), argNodes[1], env);
  }
  const args = argNodes.map((a) => evaluate(a, env));
  const one = (f: (a: Q) => Value) => {
    if (args.length !== 1) throw new EvalError(`${name}() takes 1 argument`);
    return lift1(args[0], f);
  };
  const real = (f: (x: number) => number, what = name) =>
    one((a) => {
      requireDimless(a, env, what + "()");
      return q(N.fl(f(N.toF(a.num))));
    });

  switch (name) {
    case "sin":
    case "cos":
    case "tan":
    case "sec":
    case "csc":
    case "cot":
      return one((a) => {
        requireDimless(a, env, name + "()");
        if (N.isZero(a.num) && a.num.e)
          return q(name === "cos" || name === "sec" ? N.ONE : name === "sin" || name === "tan" ? N.ZERO : N.fl(NaN));
        const x = angleIn(a, env);
        const s = Math.sin(x),
          c = Math.cos(x);
        const r = { sin: s, cos: c, tan: s / c, sec: 1 / c, csc: 1 / s, cot: c / s }[name];
        if (Math.abs(c) < 1e-15 && (name === "tan" || name === "sec")) return q(N.fl(NaN));
        if (Math.abs(s) < 1e-15 && (name === "cot" || name === "csc")) return q(N.fl(NaN));
        return q(snap(r));
      });
    case "arcsin":
    case "arccos":
    case "arctan":
      return one((a) => {
        requireDimless(a, env, name + "()");
        const x = N.toF(a.num);
        const r = name === "arcsin" ? Math.asin(x) : name === "arccos" ? Math.acos(x) : Math.atan(x);
        if (Number.isNaN(r)) return q(N.fl(NaN));
        if (N.isZero(a.num) && name !== "arccos") return q(N.ZERO);
        return angleOut(r, env);
      });
    case "sinh":
      return real(Math.sinh);
    case "cosh":
      return real(Math.cosh);
    case "tanh":
      return real(Math.tanh);
    case "arcsinh":
      return real(Math.asinh);
    case "arccosh":
      return real(Math.acosh);
    case "arctanh":
      return real(Math.atanh);
    case "ln":
      return one((a) => {
        requireDimless(a, env, "ln()");
        if (a.num.e && a.num.n === 1n && a.num.d === 1n) return q(N.ZERO);
        const x = N.toF(a.num);
        return q(N.fl(x > 0 ? Math.log(x) : NaN));
      });
    case "log": {
      if (args.length === 2) {
        return lift(args[0], args[1], (a, b) => {
          requireDimless(a, env, "log()");
          requireDimless(b, env, "log()");
          const x = N.toF(a.num),
            base = N.toF(b.num);
          const r = Math.log(x) / Math.log(base);
          const ri = Math.round(r);
          if (a.num.e && b.num.e && Math.abs(r - ri) < 1e-12 && N.cmp(N.pow(b.num, N.int(ri)), a.num) === 0)
            return q(N.int(ri));
          return q(N.fl(x > 0 ? r : NaN));
        });
      }
      return one((a) => {
        requireDimless(a, env, "log()");
        const x = N.toF(a.num);
        const r = Math.log10(x);
        if (a.num.e && Number.isInteger(r) && N.cmp(N.pow(N.int(10), N.int(r)), a.num) === 0) return q(N.int(r));
        return q(N.fl(x > 0 ? r : NaN));
      });
    }
    case "exp":
      return one((a) => {
        requireDimless(a, env, "exp()");
        if (N.isZero(a.num) && a.num.e) return q(N.ONE);
        return q(N.fl(Math.exp(N.toF(a.num))));
      });
    case "sqrt":
      return one((a) => {
        const r = N.pow(a.num, N.rat(1n, 2n));
        return q(r, dimScale(a.dim, 0.5));
      });
    case "root": {
      if (args.length !== 2) throw new EvalError("root(x, n) takes 2 arguments");
      return lift(args[0], args[1], (a, b) => {
        requireDimless(b, env, "root()");
        return q(N.pow(a.num, N.div(N.ONE, b.num)), dimScale(a.dim, 1 / N.toF(b.num)));
      });
    }
    case "abs":
      return one((a) => ({ ...a, disp: undefined, num: N.sign(a.num) < 0 ? N.neg(a.num) : a.num }));
    case "sign":
      return one((a) => q(N.int(N.sign(a.num))));
    case "floor":
      return one((a) => ({ ...a, disp: undefined, num: N.floor(a.num) }));
    case "ceiling":
      return one((a) => ({ ...a, disp: undefined, num: N.neg(N.floor(N.neg(a.num))) }));
    case "ipart":
      return one((a) => ({
        ...a,
        disp: undefined,
        num: N.sign(a.num) < 0 ? N.neg(N.floor(N.neg(a.num))) : N.floor(a.num),
      }));
    case "fpart":
      return one((a) => {
        const ip = N.sign(a.num) < 0 ? N.neg(N.floor(N.neg(a.num))) : N.floor(a.num);
        return { ...a, disp: undefined, num: N.sub(a.num, ip) };
      });
    case "round": {
      const digits = args.length > 1 ? Number(intArg(asQ(args[1]), "round")) : 0;
      return lift1(args[0], (a) => {
        if (a.num.e && digits >= 0) {
          const s = 10n ** BigInt(digits);
          const scaled = N.mul(a.num, N.rat(s));
          const r = N.floor(N.add(scaled, N.rat(1n, 2n)));
          return { ...a, disp: undefined, num: N.div(r, N.rat(s)) };
        }
        const f = 10 ** digits;
        return { ...a, disp: undefined, num: N.fl(Math.round(N.toF(a.num) * f) / f) };
      });
    }
    case "mod":
    case "remain": {
      if (args.length !== 2) throw new EvalError(`${name}(a, b) takes 2 arguments`);
      return lift(args[0], args[1], (a, b) => {
        requireSameDim(a, b, env);
        if (N.isZero(b.num)) return a;
        const quot = N.div(a.num, b.num);
        const k = name === "mod" ? N.floor(quot) : N.sign(quot) < 0 ? N.neg(N.floor(N.neg(quot))) : N.floor(quot);
        return q(N.sub(a.num, N.mul(k, b.num)), a.dim);
      });
    }
    case "gcd":
    case "lcm": {
      const xs = flatten(args).map((a) => intArg(a, name));
      if (!xs.length) throw new EvalError(`${name}() needs arguments`);
      let acc = xs[0] < 0n ? -xs[0] : xs[0];
      for (const x of xs.slice(1)) {
        const g = N.bgcd(acc, x);
        acc = name === "gcd" ? g : g === 0n ? 0n : (acc / g) * (x < 0n ? -x : x);
      }
      return q(N.rat(acc));
    }
    case "min":
    case "max": {
      const xs = flatten(args);
      if (!xs.length) throw new EvalError(`${name}() needs arguments`);
      return xs.reduce((best, x) => {
        requireSameDim(best, x, env);
        const c = N.cmp(x.num, best.num);
        return (name === "min" ? c < 0 : c > 0) ? x : best;
      });
    }
    case "ncr":
    case "npr": {
      if (args.length !== 2) throw new EvalError(`${name}(n, r) takes 2 arguments`);
      return lift(args[0], args[1], (a, b) => {
        const n = intArg(a, name),
          r = intArg(b, name);
        if (r < 0n || n < 0n || r > n) return q(N.ZERO);
        // nCr(n,r) = nCr(n,n-r): multiply by the smaller count, dividing as we go (each step stays an integer).
        const k = name === "ncr" && n - r < r ? n - r : r;
        if (k > 20000n) throw new EvalError(`${name}(): result is too large to compute exactly`);
        let acc = 1n;
        for (let i = 0n; i < k; i++) {
          acc *= n - i;
          if (name === "ncr") acc /= i + 1n;
        }
        return q(N.rat(acc));
      });
    }
    case "approx":
      if (args.length !== 1) throw new EvalError("approx() takes 1 argument");
      return toApprox(args[0]);
    case "exact":
      if (args.length !== 1) throw new EvalError("exact() takes 1 argument");
      return toExact(args[0]);
    case "sum":
    case "mean": {
      const xs = flatten(args);
      if (!xs.length) throw new EvalError(`${name}() needs a list`);
      const total = xs.reduce((acc, x) => addQ(acc, x, env));
      return name === "sum" ? total : divQ(total, q(N.int(xs.length)));
    }
  }
  throw new EvalError(`Unknown function ${name}`);
}

function compare(op: string, a: Q, b: Q, env: Env): boolean {
  if (!isExactZero(a) && !isExactZero(b)) requireSameDim(a, b, env);
  if (N.isNaNum(a.num) || N.isNaNum(b.num)) return false;
  const c = op === "=" || op === "≠" ? (N.approxEq(a.num, b.num) ? 0 : 1) : N.cmp(a.num, b.num);
  switch (op) {
    case "=":
      return c === 0;
    case "≠":
      return c !== 0;
    case "<":
      return c < 0;
    case ">":
      return c > 0;
    case "≤":
      return c <= 0;
    case "≥":
      return c >= 0;
  }
  return false;
}

function asBool(v: Value): boolean {
  if (v.k !== "bool") throw new EvalError("Expected a true/false condition");
  return v.v;
}

/** Splits the right side of `|` into substitutions (x=3) and other conditions (x>0). */
export function applyWith(cond: Node, env: Env): Env {
  const locals = new Map(env.locals ?? []);
  const constraints = [...(env.constraints ?? [])];
  const inner: Env = { ...env, locals, constraints };
  for (const c of conjuncts(cond)) {
    if (c.type === "rel" && c.op === "=" && c.l.type === "var") {
      let v: Value;
      try {
        v = evaluate(c.r, inner);
      } catch (e) {
        // x=a+1 with unknown a: substitute the expression symbolically.
        if (!(e instanceof UndefinedVar)) throw e;
        v = { k: "expr", node: c.r };
      }
      locals.set(c.l.name, v);
    } else {
      constraints.push(c);
    }
  }
  return inner;
}

export function lookupVar(name: string, env: Env): Value | undefined {
  return env.locals?.get(name) ?? env.vars.get(name);
}

export function evaluate(n: Node, env: Env): Value {
  switch (n.type) {
    case "num":
      return q(n.value);
    case "bool":
      return { k: "bool", v: n.value };
    case "var": {
      const v = lookupVar(n.name, env);
      if (v) return v;
      throw new UndefinedVar(n.name);
    }
    case "unit": {
      const u = lookupNspire(n.name);
      if (!u) throw new EvalError(`Unknown unit _${n.name}`);
      return q(u.factor, u.dim, u.angle);
    }
    case "const":
      return q(N.fl(n.name === "π" ? Math.PI : n.name === "e" ? Math.E : Infinity));
    case "add":
      return lift(evaluate(n.l, env), evaluate(n.r, env), (a, b) => addQ(a, b, env));
    case "sub":
      return lift(evaluate(n.l, env), evaluate(n.r, env), (a, b) => addQ(a, { ...b, num: N.neg(b.num) }, env));
    case "mul":
      return lift(evaluate(n.l, env), evaluate(n.r, env), mulQ);
    case "div":
      return lift(evaluate(n.l, env), evaluate(n.r, env), divQ);
    case "pow":
      return lift(evaluate(n.l, env), evaluate(n.r, env), (a, b) => powQ(a, b, env));
    case "neg":
      return lift1(evaluate(n.arg, env), (a) => ({ ...a, disp: undefined, num: N.neg(a.num) }));
    case "fact":
      return lift1(evaluate(n.arg, env), (a) => {
        requireDimless(a, env, "!");
        return factorial(a);
      });
    case "pct":
      return lift1(evaluate(n.arg, env), (a) => ({ ...a, disp: undefined, num: N.div(a.num, N.int(100)) }));
    case "call": {
      const uf = env.funcs.get(n.name);
      if (uf && !env.locals?.has(n.name)) {
        if (uf.params.length !== n.args.length)
          throw new EvalError(`${n.name}() takes ${uf.params.length} argument(s)`);
        if ((env.depth ?? 0) > 64) throw new EvalError("Recursion too deep");
        const locals = new Map(env.locals ?? []);
        uf.params.forEach((p, i) => locals.set(p, evaluate(n.args[i], env)));
        return evaluate(uf.body, { ...env, locals, depth: (env.depth ?? 0) + 1 });
      }
      return callBuiltin(n.name, n.args, env);
    }
    case "rel": {
      const l = evaluate(n.l, env),
        r = evaluate(n.r, env);
      if (l.k === "bool" || r.k === "bool") {
        if (n.op !== "=" && n.op !== "≠") throw new EvalError("Cannot compare true/false");
        return { k: "bool", v: (n.op === "=") === (asBool(l) === asBool(r)) };
      }
      if (l.k === "list" || r.k === "list") {
        return lift(l, r, (a, b) => ({ k: "bool", v: compare(n.op, a, b, env) }));
      }
      return { k: "bool", v: compare(n.op, asQ(l), asQ(r), env) };
    }
    case "and":
      return { k: "bool", v: asBool(evaluate(n.l, env)) && asBool(evaluate(n.r, env)) };
    case "or":
      return { k: "bool", v: asBool(evaluate(n.l, env)) || asBool(evaluate(n.r, env)) };
    case "not":
      return { k: "bool", v: !asBool(evaluate(n.arg, env)) };
    case "list":
      return { k: "list", items: n.items.map((x) => evaluate(x, env)) };
    case "convert":
      return convert(tempReading(n.l, env) ?? evaluate(n.l, env), n.r, env);
    case "with":
      return evaluate(n.l, applyWith(n.r, env));
    case "assign":
      throw new EvalError("Assignment is only allowed at the top level");
  }
}
