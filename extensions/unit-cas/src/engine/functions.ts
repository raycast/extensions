// Additional TI-Nspire functions: vectors, list statistics, calculus and symbolic helpers.

import { Node } from "./ast";
import { Env, EvalError, Q, Value, addQ, divQ, evaluate, mulQ, powQ, q, registerFunction } from "./evaluate";
import * as N from "./num";
import { freeVars, recognize } from "./solve";
import { Algebra, nthDerivative } from "./symbolic";
import { DIMLESS, dimEq, isDimless } from "./units";

const asList = (v: Value, what: string): Value[] => {
  if (v.k !== "list") throw new EvalError(`${what} expects a list or vector`);
  return v.items;
};
const asQ = (v: Value, what: string): Q => {
  if (v.k !== "q") throw new EvalError(`${what} expects numbers`);
  return v;
};
const qs = (v: Value, what: string): Q[] => asList(v, what).map((x) => asQ(x, what));
const list = (items: Value[]): Value => ({ k: "list", items });
const ev = (n: Node, env: Env) => evaluate(n, env);

function sumQ(xs: Q[], env: Env): Q {
  return xs.reduce((a, b) => addQ(a, b, env), q(N.ZERO));
}

function varName(n: Node | undefined, what: string): string {
  if (n?.type === "var") return n.name;
  if (n?.type === "rel" && n.l.type === "var") return n.l.name;
  throw new EvalError(`${what} needs a variable`);
}

function withLocal(env: Env, name: string, v: Value): Env {
  const locals = new Map(env.locals ?? []);
  locals.set(name, v);
  return { ...env, locals };
}

function argCount(args: Node[], min: number, max: number, usage: string) {
  if (args.length < min || args.length > max) throw new EvalError(`Usage: ${usage}`);
}

// ---------------------------------------------------------------- vectors

registerFunction("dotp", (args, env) => {
  argCount(args, 2, 2, "dotP(vector1, vector2)");
  const a = qs(ev(args[0], env), "dotP"),
    b = qs(ev(args[1], env), "dotP");
  if (a.length !== b.length) throw new EvalError("dotP: vectors must have the same length");
  return sumQ(
    a.map((x, i) => mulQ(x, b[i])),
    env,
  );
});

registerFunction("crossp", (args, env) => {
  argCount(args, 2, 2, "crossP(vector1, vector2)");
  const pad = (v: Q[]) => (v.length === 2 ? [...v, q(N.ZERO)] : v);
  const a = pad(qs(ev(args[0], env), "crossP")),
    b = pad(qs(ev(args[1], env), "crossP"));
  if (a.length !== 3 || b.length !== 3) throw new EvalError("crossP needs 2- or 3-element vectors");
  const c = (i: number, j: number) =>
    addQ(mulQ(a[i], b[j]), { ...mulQ(a[j], b[i]), num: N.neg(mulQ(a[j], b[i]).num) }, env);
  return list([c(1, 2), c(2, 0), c(0, 1)]);
});

function norm(v: Q[], env: Env): Q {
  return powQ(
    sumQ(
      v.map((x) => mulQ(x, x)),
      env,
    ),
    q(N.rat(1n, 2n)),
    env,
  );
}

registerFunction("norm", (args, env) => {
  argCount(args, 1, 1, "norm(vector)");
  return norm(qs(ev(args[0], env), "norm"), env);
});

registerFunction("unitv", (args, env) => {
  argCount(args, 1, 1, "unitV(vector)");
  const v = qs(ev(args[0], env), "unitV");
  const n = norm(v, env);
  return list(v.map((x) => divQ(x, n)));
});

// ---------------------------------------------------------------- lists & statistics

function sorted(xs: Q[]): Q[] {
  return [...xs].sort((a, b) => N.cmp(a.num, b.num));
}

registerFunction("median", (args, env) => {
  const xs = sorted(qs(ev(args[0], env), "median"));
  if (!xs.length) throw new EvalError("median of an empty list");
  const m = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[m] : divQ(addQ(xs[m - 1], xs[m], env), q(N.int(2)));
});

function variance(xs: Q[], env: Env, sample: boolean): Q {
  if (xs.length < (sample ? 2 : 1)) throw new EvalError("Not enough data");
  const mean = divQ(sumQ(xs, env), q(N.int(xs.length)));
  const ss = sumQ(
    xs.map((x) => {
      const d = addQ(x, { ...mean, num: N.neg(mean.num) }, env);
      return mulQ(d, d);
    }),
    env,
  );
  return divQ(ss, q(N.int(sample ? xs.length - 1 : xs.length)));
}

registerFunction("varsamp", (args, env) => variance(qs(ev(args[0], env), "varSamp"), env, true));
registerFunction("varpop", (args, env) => variance(qs(ev(args[0], env), "varPop"), env, false));
registerFunction("stdevsamp", (args, env) =>
  powQ(variance(qs(ev(args[0], env), "stDevSamp"), env, true), q(N.rat(1n, 2n)), env),
);
registerFunction("stdevpop", (args, env) =>
  powQ(variance(qs(ev(args[0], env), "stDevPop"), env, false), q(N.rat(1n, 2n)), env),
);

registerFunction("cumsum", (args, env) => {
  const xs = qs(ev(args[0], env), "cumSum");
  let acc = q(N.ZERO);
  return list(xs.map((x) => (acc = addQ(acc, x, env))));
});
registerFunction("dim", (args, env) => q(N.int(asList(ev(args[0], env), "dim").length)));
registerFunction("sorta", (args, env) => list(sorted(qs(ev(args[0], env), "SortA"))));
registerFunction("sortd", (args, env) => list(sorted(qs(ev(args[0], env), "SortD")).reverse()));
registerFunction("augment", (args, env) => list(args.flatMap((a) => asList(ev(a, env), "augment"))));

/** seq(expr, var, low, high[, step]) */
registerFunction("seq", (args, env) => {
  argCount(args, 4, 5, "seq(expr, var, low, high[, step])");
  const v = varName(args[1], "seq");
  const lo = asQ(ev(args[2], env), "seq"),
    hi = asQ(ev(args[3], env), "seq");
  const step = args[4] ? asQ(ev(args[4], env), "seq") : q(N.ONE);
  if (N.isZero(step.num)) throw new EvalError("seq: step cannot be 0");
  const out: Value[] = [];
  for (let x = lo.num; N.sign(step.num) > 0 ? N.cmp(x, hi.num) <= 0 : N.cmp(x, hi.num) >= 0; x = N.add(x, step.num)) {
    if (out.length > 10000) throw new EvalError("seq: too many elements");
    out.push(ev(args[0], withLocal(env, v, q(x, lo.dim))));
  }
  return list(out);
});

/** Σ(expr, var, low, high) and Π(...) as sum()/product() with four arguments. */
function series(kind: "sum" | "product") {
  return (args: Node[], env: Env): Value | undefined => {
    if (args.length === 1) {
      if (kind === "sum") return undefined;
      const xs = qs(ev(args[0], env), "product");
      return xs.reduce((a, b) => mulQ(a, b), q(N.ONE));
    }
    if (args.length !== 4) return undefined;
    const v = varName(args[1], kind);
    const lo = asQ(ev(args[2], env), kind),
      hi = asQ(ev(args[3], env), kind);
    let acc: Q = q(kind === "sum" ? N.ZERO : N.ONE);
    let count = 0;
    for (let x = lo.num; N.cmp(x, hi.num) <= 0; x = N.add(x, N.ONE)) {
      if (++count > 100000) throw new EvalError(`${kind}: too many terms`);
      const t = asQ(ev(args[0], withLocal(env, v, q(x))), kind);
      acc = kind === "sum" ? addQ(acc, t, env) : mulQ(acc, t);
    }
    return acc;
  };
}
registerFunction("sum", series("sum"));
registerFunction("product", series("product"));

registerFunction("when", (args, env) => {
  argCount(args, 2, 4, "when(condition, trueResult[, falseResult[, unknownResult]])");
  const c = ev(args[0], env);
  if (c.k !== "bool") throw new EvalError("when: condition must be true or false");
  if (c.v) return ev(args[1], env);
  if (!args[2]) throw new EvalError("when: condition is false and there is no false result");
  return ev(args[2], env);
});

// ---------------------------------------------------------------- integers

const intOf = (v: Value, what: string): bigint => {
  const x = asQ(v, what);
  if (!x.num.e || x.num.d !== 1n) throw new EvalError(`${what} needs an integer`);
  return x.num.n;
};

function isPrime(n: bigint): boolean {
  if (n < 2n) return false;
  for (const p of [2n, 3n, 5n, 7n, 11n, 13n]) if (n % p === 0n) return n === p;
  for (let i = 17n; i * i <= n; i += 2n) {
    if (n % i === 0n) return false;
    if (i > 10000000n) throw new EvalError("isPrime: number too large");
  }
  return true;
}

registerFunction("isprime", (args, env) => ({ k: "bool", v: isPrime(intOf(ev(args[0], env), "isPrime")) }));
registerFunction("intdiv", (args, env) => {
  argCount(args, 2, 2, "intDiv(a, b)");
  const a = intOf(ev(args[0], env), "intDiv"),
    b = intOf(ev(args[1], env), "intDiv");
  if (b === 0n) throw new EvalError("Division by zero");
  return q(N.rat(a / b));
});
registerFunction("getnum", (args, env) => {
  const x = asQ(ev(args[0], env), "getNum");
  if (!x.num.e) throw new EvalError("getNum needs an exact fraction");
  return q(N.rat(x.num.n));
});
registerFunction("getdenom", (args, env) => {
  const x = asQ(ev(args[0], env), "getDenom");
  if (!x.num.e) throw new EvalError("getDenom needs an exact fraction");
  return q(N.rat(x.num.d));
});

registerFunction("factor", (args, env) => {
  if (freeVars(args[0], env).length) throw new EvalError("factor() supports integers only");
  let n = intOf(ev(args[0], env), "factor");
  const neg = n < 0n;
  if (neg) n = -n;
  if (n < 2n) return q(N.rat(neg ? -n : n));
  const parts: Node[] = [];
  for (let p = 2n; p * p <= n; p += p === 2n ? 1n : 2n) {
    if (p > 10000000n) throw new EvalError("factor: number too large");
    let k = 0;
    while (n % p === 0n) {
      n /= p;
      k++;
    }
    if (k)
      parts.push(
        k === 1
          ? { type: "num", value: N.rat(p) }
          : { type: "pow", l: { type: "num", value: N.rat(p) }, r: { type: "num", value: N.int(k) } },
      );
  }
  if (n > 1n) parts.push({ type: "num", value: N.rat(n) });
  let node = parts.reduce((a, b) => ({ type: "mul", l: a, r: b }));
  if (neg) node = { type: "neg", arg: node };
  return { k: "expr", node };
});

// ---------------------------------------------------------------- symbolic

registerFunction("expand", (args, env) => {
  argCount(args, 1, 2, "expand(expression)");
  const alg = new Algebra(env);
  return { k: "expr", node: alg.toNode(alg.from(args[0])) };
});

function symbolicValue(node: Node, env: Env, keep: string[]): Value {
  const alg = new Algebra(env, new Set(keep));
  const simplified = alg.toNode(alg.from(node));
  if (!freeVars(simplified, env).length) return evaluate(simplified, env);
  return { k: "expr", node: simplified };
}

/** d(expr, x): symbolic derivative; evaluates when x has a value (e.g. d(x^2,x)|x=3). */
function derivativeFn(args: Node[], env: Env): Value {
  argCount(args, 2, 3, "d(expression, variable[, order])");
  const x = varName(args[1], "d()");
  const order = args[2] ? Number(intOf(ev(args[2], env), "d()")) : 1;
  const D = nthDerivative(args[0], x, order, env);
  if (args[1].type === "rel") env = withLocal(env, x, ev(args[1].r, env));
  if (env.locals?.has(x) || env.vars.has(x)) {
    if (!freeVars(D, { ...env }).length) return evaluate(D, env);
  }
  return symbolicValue(D, { ...env, locals: new Map([...(env.locals ?? [])].filter(([k]) => k !== x)) }, [x]);
}
registerFunction("d", derivativeFn);

// ---------------------------------------------------------------- numeric calculus

function numericFn(expr: Node, x: string, env: Env, dimX: number[]) {
  return (t: number): Q | null => {
    try {
      const v = evaluate(expr, withLocal(env, x, q(N.fl(t), dimX)));
      return v.k === "q" ? v : null;
    } catch {
      return null;
    }
  };
}

/** nDeriv(expr, x[, h]) at the current value of x, or nDeriv(expr, x=value[, h]). */
registerFunction("nderiv", (args, env) => {
  argCount(args, 2, 3, "nDeriv(expression, variable=value[, h])");
  const x = varName(args[1], "nDeriv");
  const at = args[1].type === "rel" ? ev(args[1].r, env) : (env.locals?.get(x) ?? env.vars.get(x));
  if (!at || at.k !== "q") throw new EvalError("nDeriv: give the point as nDeriv(expr, x=value) or with |x=value");
  const h0 = args[2] ? N.toF(asQ(ev(args[2], env), "nDeriv").num) : 1e-3;
  const t = N.toF(at.num);
  const f = numericFn(args[0], x, env, at.dim);
  const h = h0 * Math.max(1, Math.abs(t)) * (args[2] ? 1 / Math.max(1, Math.abs(t)) : 1);
  const a = f(t + h),
    b = f(t - h);
  if (!a || !b) throw new EvalError("nDeriv: function is undefined near this point");
  // Richardson extrapolation for accuracy.
  const a2 = f(t + h / 2),
    b2 = f(t - h / 2);
  const d1 = (N.toF(a.num) - N.toF(b.num)) / (2 * h);
  const d2 = a2 && b2 ? (N.toF(a2.num) - N.toF(b2.num)) / h : d1;
  const val = (4 * d2 - d1) / 3;
  return q(
    N.fl(val),
    a.dim.map((d, i) => d - (at.dim[i] ?? 0)),
  );
});

/** Adaptive Simpson; NaN when the integrand is undefined somewhere, bounded total work. */
function simpson(f: (t: number) => number, a: number, b: number): number {
  let budget = 200_000;
  let scale = 1;
  const rec = (
    a: number,
    b: number,
    fa: number,
    fm: number,
    fb: number,
    whole: number,
    depth: number,
    eps: number,
  ): number => {
    const m = (a + b) / 2,
      lm = (a + m) / 2,
      rm = (m + b) / 2;
    const flm = f(lm),
      frm = f(rm);
    if (!Number.isFinite(flm) || !Number.isFinite(frm)) return NaN;
    budget -= 2;
    const left = ((m - a) / 6) * (fa + 4 * flm + fm),
      right = ((b - m) / 6) * (fm + 4 * frm + fb);
    const est = left + right + (left + right - whole) / 15;
    if (Math.abs(left + right - whole) <= 15 * eps) return est;
    if (budget <= 0) return est;
    // Out of depth: accept a small leftover error (integrable singularity), reject a large one (pole).
    if (depth <= 0) return Math.abs(left + right - whole) <= 1e-4 * Math.max(1, scale) ? est : NaN;
    return rec(a, m, fa, flm, fm, left, depth - 1, eps / 2) + rec(m, b, fm, frm, fb, right, depth - 1, eps / 2);
  };
  const fa = f(a),
    fb = f(b),
    fm = f((a + b) / 2);
  if (!Number.isFinite(fa) || !Number.isFinite(fb) || !Number.isFinite(fm)) return NaN;
  const whole = ((b - a) / 6) * (fa + 4 * fm + fb);
  scale = Math.abs(b - a) * Math.max(Math.abs(fa), Math.abs(fb));
  return rec(a, b, fa, fm, fb, whole, 40, 1e-12 * Math.max(1, Math.abs(whole)));
}

/** nInt(expr, x, a, b) — also ∫(expr, x, a, b). */
function integralFn(args: Node[], env: Env): Value {
  if (args.length === 2) throw new EvalError("Only definite integrals are supported: ∫(expr, x, a, b)");
  argCount(args, 4, 4, "nInt(expression, variable, lower, upper)");
  const x = varName(args[1], "nInt");
  const a = asQ(ev(args[2], env), "nInt"),
    b = asQ(ev(args[3], env), "nInt");
  if (!dimEq(a.dim, b.dim)) throw new EvalError("nInt: bounds have different units");
  const f = numericFn(args[0], x, env, a.dim);
  let dimF: number[] | undefined;
  const g = (t: number) => {
    // Nudge off singular points (endpoints, removable singularities like sin(x)/x at 0).
    const ok = (v: Q | null): v is Q => !!v && Number.isFinite(N.toF(v.num));
    let v = f(t);
    if (!ok(v)) v = f(t + 1e-12 * Math.max(1, Math.abs(t)));
    if (!ok(v)) return NaN;
    dimF ??= v.dim;
    return N.toF(v.num);
  };
  const A = N.toF(a.num),
    B = N.toF(b.num);
  const val = simpson(g, A + (Number.isFinite(g(A)) ? 0 : 1e-12), B - (Number.isFinite(g(B)) ? 0 : 1e-12));
  if (!Number.isFinite(val)) throw new EvalError("nInt: integral did not converge");
  const dim = (dimF ?? DIMLESS).map((d, i) => d + (a.dim[i] ?? 0));
  const ex = isDimless(dim) && env.settings.mode !== "approx" ? recognize(val) : null;
  if (ex) return { k: "expr", node: ex };
  return q(N.fl(Math.abs(val) < 1e-15 ? 0 : val), dim);
}
registerFunction("nint", integralFn);
registerFunction("integral", integralFn);

/** fMin/fMax(expr, x)|bounds → x=… */
function extremum(kind: "min" | "max") {
  return (args: Node[], env: Env): Value => {
    argCount(args, 2, 4, `f${kind === "min" ? "Min" : "Max"}(expression, variable[, lower, upper])`);
    const x = varName(args[1], "fMin/fMax");
    let lo = -100,
      hi = 100;
    for (const c of env.constraints ?? []) {
      if (c.type === "rel" && c.l.type === "var" && c.l.name === x) {
        const v = N.toF(asQ(ev(c.r, env), "bound").num);
        if (c.op === ">" || c.op === "≥") lo = v;
        if (c.op === "<" || c.op === "≤") hi = v;
      }
    }
    if (args[2]) lo = N.toF(asQ(ev(args[2], env), "bound").num);
    if (args[3]) hi = N.toF(asQ(ev(args[3], env), "bound").num);
    const f = numericFn(args[0], x, env, DIMLESS);
    const s = kind === "min" ? 1 : -1;
    const g = (t: number) => {
      const v = f(t);
      return v ? s * N.toF(v.num) : Infinity;
    };
    const steps = 4000;
    let best = lo,
      bv = g(lo);
    for (let i = 1; i <= steps; i++) {
      const t = lo + ((hi - lo) * i) / steps;
      const v = g(t);
      if (v < bv) [best, bv] = [t, v];
    }
    let a = Math.max(lo, best - (hi - lo) / steps),
      b = Math.min(hi, best + (hi - lo) / steps);
    const gr = (Math.sqrt(5) - 1) / 2;
    for (let i = 0; i < 100; i++) {
      const c = b - gr * (b - a),
        d = a + gr * (b - a);
      if (g(c) < g(d)) b = d;
      else a = c;
    }
    const t = (a + b) / 2;
    const at =
      Math.abs(t - lo) < 1e-6 * Math.max(1, Math.abs(lo))
        ? lo
        : Math.abs(t - hi) < 1e-6 * Math.max(1, Math.abs(hi))
          ? hi
          : t;
    const exact = env.settings.mode !== "approx" ? recognize(Number(at.toPrecision(8))) : null;
    return {
      k: "expr",
      node: { type: "rel", op: "=", l: { type: "var", name: x }, r: exact ?? { type: "num", value: N.fl(at) } },
    };
  };
}
registerFunction("fmin", extremum("min"));
registerFunction("fmax", extremum("max"));

registerFunction("system", () => {
  throw new EvalError("system() is used inside solve(): solve(system(eq1, eq2), x, y)");
});

export {};
