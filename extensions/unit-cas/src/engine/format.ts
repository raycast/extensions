import { Node } from "./ast";
import { FUNCS } from "./builtins";
import { Settings, Value } from "./evaluate";
import * as N from "./num";
import { Num } from "./num";
import { BASE_DISPLAY, DEFAULT_DERIVED, Dim, dimEq, isDimless, lookupNspire } from "./units";

// ---------- numbers ----------

export interface FloatParts {
  mant: string;
  exp: number | null;
  isInt: boolean;
  special?: string;
}

export function floatParts(v: number, digits: number): FloatParts {
  if (Number.isNaN(v)) return { mant: "", exp: null, isInt: false, special: "undef" };
  if (!Number.isFinite(v)) return { mant: "", exp: null, isInt: false, special: v > 0 ? "∞" : "-∞" };
  if (v === 0) return { mant: "0", exp: null, isInt: true };
  if (digits === 0) {
    // Shortest round-trip representation (used for echoing input).
    const [m, e] = v.toExponential().split("e");
    const ex = Number(e);
    if (ex >= 15 || ex < -3) return { mant: m, exp: ex, isInt: !m.includes(".") };
    const s = String(v);
    return { mant: s, exp: null, isInt: !s.includes(".") };
  }
  const r = Number(v.toPrecision(digits));
  const e = Math.floor(Math.log10(Math.abs(r)));
  const strip = (s: string) => (s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s);
  if (e >= digits || e < -3) {
    const m = strip((r / 10 ** e).toPrecision(digits));
    return { mant: m, exp: e, isInt: !m.includes(".") };
  }
  const m = strip(r.toFixed(Math.max(0, digits - 1 - e)));
  return { mant: m, exp: null, isInt: !m.includes(".") };
}

// ---------- values to nodes ----------

const numNode = (value: Num): Node => ({ type: "num", value });

export function unitNodeForDim(dim: Dim): Node | null {
  if (isDimless(dim)) return null;
  for (const name of DEFAULT_DERIVED) {
    const u = lookupNspire(name)!;
    if (dimEq(u.dim, dim)) return { type: "unit", name };
  }
  // J/(K*mol) style: a derived unit times base units that are not m, kg or s.
  let best: { name: string; rest: Dim; cost: number } | undefined;
  const cost = (d: Dim) => d.slice(0, 7).reduce((a, x) => a + Math.abs(x), 0);
  for (const name of DEFAULT_DERIVED) {
    const u = lookupNspire(name)!;
    const rest = dim.slice(0, 7).map((x, i) => x - (u.dim[i] ?? 0));
    if (Math.abs(rest[0]) + Math.abs(rest[1]) + Math.abs(rest[2]) > 1e-9) continue;
    const c = cost(rest) + 1;
    if (c < cost(dim) && (!best || c < best.cost)) best = { name, rest, cost: c };
  }
  const numer: Node[] = [],
    denom: Node[] = [];
  let base = dim;
  if (best) {
    numer.push({ type: "unit", name: best.name });
    base = best.rest;
  }
  for (const { idx, nspire } of BASE_DISPLAY) {
    const e = base[idx] ?? 0;
    if (Math.abs(e) < 1e-9) continue;
    const u: Node = { type: "unit", name: nspire };
    const ae = Math.abs(e);
    let expNode: Node | null = null;
    if (Math.abs(ae - 1) > 1e-9) {
      const r = N.toRat(ae, 100);
      expNode = r
        ? r.e && r.d !== 1n
          ? { type: "div", l: numNode(N.rat(r.n)), r: numNode(N.rat(r.d)) }
          : numNode(r)
        : numNode(N.fl(ae));
    }
    (e > 0 ? numer : denom).push(expNode ? { type: "pow", l: u, r: expNode } : u);
  }
  const prod = (xs: Node[]): Node => xs.reduce((a, b) => ({ type: "mul", l: a, r: b }));
  if (!numer.length) return { type: "div", l: numNode(N.ONE), r: prod(denom) };
  return denom.length ? { type: "div", l: prod(numer), r: prod(denom) } : prod(numer);
}

export function withUnit(n: Node, unit: Node | null): Node {
  return unit ? { type: "mul", l: n, r: unit } : n;
}

function digitCount(n: bigint): number {
  return (n < 0n ? -n : n).toString().length;
}

export function valueToNode(v: Value, s: Settings): Node {
  // Exact numbers too long for the display digits are shown in scientific notation (1.26765ᴇ30),
  // like the Nspire in Float mode; Exact mode keeps every digit.
  const tooLong = (x: Num) => x.e && s.mode === "auto" && (digitCount(x.n) > s.digits || digitCount(x.d) > s.digits);
  const fix = (x: Num) => (s.mode === "approx" || tooLong(x) ? N.toFloat(x) : x);
  // Like the Nspire, unit results are shown as decimals unless they are whole numbers.
  const fixUnit = (x: Num) => (s.mode === "auto" && x.e && x.d !== 1n ? N.toFloat(x) : fix(x));
  switch (v.k) {
    case "q":
      if (v.disp) return withUnit(numNode(fixUnit(v.disp.num)), v.disp.unit);
      if (!isDimless(v.dim)) return withUnit(numNode(fixUnit(v.num)), unitNodeForDim(v.dim));
      return numNode(fix(v.num));
    case "list":
      return { type: "list", items: v.items.map((x) => valueToNode(x, s)) };
    case "bool":
      return { type: "bool", value: v.v };
    case "expr":
      return s.mode === "approx" ? approxNode(v.node) : v.node;
  }
}

/** Replaces exact subexpressions (fractions, surds, π multiples) by decimals. */
export function approxNode(n: Node): Node {
  const val = numericValue(n);
  if (val !== null) return numNode(N.fl(val));
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
      return { ...n, l: approxNode(n.l), r: approxNode(n.r) } as Node;
    case "neg":
      return { type: "neg", arg: approxNode(n.arg) };
    case "list":
      return { type: "list", items: n.items.map(approxNode) };
    case "call":
      return { ...n, args: n.args.map(approxNode) };
    default:
      return n;
  }
}

/** Numeric value of a constant expression made only of numbers, π, e, sqrt, +-*÷^. */
export function numericValue(n: Node): number | null {
  switch (n.type) {
    case "num":
      return N.toF(n.value);
    case "const":
      return n.name === "π" ? Math.PI : n.name === "e" ? Math.E : null;
    case "neg": {
      const a = numericValue(n.arg);
      return a === null ? null : -a;
    }
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "pow": {
      const a = numericValue(n.l),
        b = numericValue(n.r);
      if (a === null || b === null) return null;
      return n.type === "add"
        ? a + b
        : n.type === "sub"
          ? a - b
          : n.type === "mul"
            ? a * b
            : n.type === "div"
              ? a / b
              : a ** b;
    }
    case "call": {
      if (n.name !== "sqrt" || n.args.length !== 1) return null;
      const a = numericValue(n.args[0]);
      return a === null ? null : Math.sqrt(a);
    }
    default:
      return null;
  }
}

export function isExactNonInteger(n: Node): boolean {
  let exact = false;
  const visit = (x: Node) => {
    if (x.type === "num" && x.value.e && x.value.d !== 1n) exact = true;
    if (x.type === "const" && x.name !== "∞") exact = true;
    if (x.type === "call" && x.name === "sqrt") exact = true;
  };
  const walkAll = (x: Node) => {
    visit(x);
    for (const k of ["l", "r", "arg"] as const) {
      const c = (x as Record<string, unknown>)[k];
      if (c && typeof c === "object") walkAll(c as Node);
    }
    if (x.type === "list") x.items.forEach(walkAll);
    if (x.type === "call") x.args.forEach(walkAll);
  };
  walkAll(n);
  return exact;
}

// ---------- precedence ----------

const PREC: Record<string, number> = {
  assign: 0,
  with: 1,
  convert: 2,
  or: 3,
  and: 4,
  not: 5,
  rel: 6,
  add: 7,
  sub: 7,
  mul: 8,
  div: 8,
  neg: 9,
  pow: 10,
  fact: 11,
  pct: 11,
};

function numPrec(v: Num, latex: boolean, digits: number): number {
  if (v.e) {
    if (v.d !== 1n) return v.n < 0n ? 9 : latex ? 12 : 8;
    return v.n < 0n ? 9 : 12;
  }
  const p = floatParts(v.v, digits);
  if (p.special) return p.special.startsWith("-") ? 9 : 12;
  if (v.v < 0) return 9;
  return p.exp !== null ? 8 : 12;
}

function prec(n: Node, latex: boolean, digits: number): number {
  if (n.type === "num") return numPrec(n.value, latex, digits);
  if (n.type === "div" && latex) return isNegLeading(n.l) ? 9 : 12;
  if (n.type === "and" && isChain(n)) return PREC.rel;
  return PREC[n.type] ?? 12;
}

function isNegLeading(n: Node): boolean {
  return n.type === "neg" || (n.type === "num" && N.sign(n.value) < 0);
}

function stripNeg(n: Node): Node {
  if (n.type === "neg") return n.arg;
  if (n.type === "num") return { type: "num", value: N.neg(n.value) };
  return n;
}

/** Coefficient-like factors that can be juxtaposed with a following variable (2π n₁). */
function isCoef(n: Node): boolean {
  if (n.type === "num") return n.value.e ? n.value.n >= 0n : n.value.v >= 0 && !/e/i.test(String(n.value.v));
  if (n.type === "const") return true;
  if (n.type === "mul") return isCoef(n.l) && isCoef(n.r);
  return false;
}

/** Factors that can be written side by side in LaTeX (4ac, 2πn₁, √2√E). */
function juxtaposable(n: Node, leftmost: boolean): boolean {
  switch (n.type) {
    case "num":
      return (
        leftmost && (n.value.e ? n.value.d === 1n && n.value.n >= 0n : n.value.v >= 0 && !/e/i.test(String(n.value.v)))
      );
    case "var":
      return !texVar(n.name).includes("\\mathit");
    case "const":
      return n.name !== "∞";
    case "pow":
      return (n.l.type === "var" || n.l.type === "const") && juxtaposable(n.l, false);
    case "call":
      return n.name === "sqrt";
    case "mul":
      return juxtaposable(n.l, leftmost) && juxtaposable(n.r, false);
    default:
      return false;
  }
}

function isChain(
  n: Node,
): n is Extract<Node, { type: "and" }> & { l: Extract<Node, { type: "rel" }>; r: Extract<Node, { type: "rel" }> } {
  return (
    n.type === "and" &&
    n.l.type === "rel" &&
    n.r.type === "rel" &&
    n.l.r.type === "var" &&
    n.r.l.type === "var" &&
    n.l.r.name === n.r.l.name &&
    ["<", "≤"].includes(n.l.op) === ["<", "≤"].includes(n.r.op) &&
    n.l.op !== "=" &&
    n.r.op !== "=" &&
    n.l.op !== "≠" &&
    n.r.op !== "≠"
  );
}

export interface FormatOptions {
  digits: number;
  ascii?: boolean;
}

// ---------- TI-Nspire ----------

const NSPIRE_REL: Record<string, [string, string]> = {
  "=": ["=", "="],
  "≠": ["≠", "/="],
  "<": ["<", "<"],
  ">": [">", ">"],
  "≤": ["≤", "<="],
  "≥": ["≥", ">="],
};

export function toNspire(n: Node, o: FormatOptions): string {
  const p = (x: Node, min: number) => {
    const s = toNspire(x, o);
    return prec(x, false, o.digits) < min ? `(${s})` : s;
  };
  switch (n.type) {
    case "num": {
      const v = n.value;
      if (v.e) return v.d === 1n ? v.n.toString() : `${v.n}/${v.d}`;
      const f = floatParts(v.v, o.digits);
      if (f.special) return f.special === "undef" ? "undef" : f.special;
      return f.mant + (f.isInt ? "." : "") + (f.exp !== null ? (o.ascii ? "E" : "ᴇ") + f.exp : "");
    }
    case "var":
      return n.name;
    case "unit":
      return "_" + n.name;
    case "const":
      return n.name === "π" ? (o.ascii ? "pi" : "π") : n.name === "e" ? "ℯ" : "∞";
    case "bool":
      return n.value ? "true" : "false";
    case "add": {
      const r = n.r;
      if (r.type === "neg") return `${p(n.l, 7)}-${p(r.arg, 8)}`;
      if (r.type === "num" && N.sign(r.value) < 0)
        return `${p(n.l, 7)}-${toNspire({ type: "num", value: N.neg(r.value) }, o)}`;
      return `${p(n.l, 7)}+${p(n.r, 8)}`;
    }
    case "sub":
      return `${p(n.l, 7)}-${p(n.r, 8)}`;
    case "mul": {
      // 5*_m/_s rather than 5*(_m/_s): equal by left associativity.
      const r = n.r;
      if (r.type === "div" && isUnitExpr(r)) {
        const numer = r.l.type === "num" && N.toF(r.l.value) === 1 ? "" : `*${p(r.l, 8)}`;
        return `${p(n.l, 8)}${numer}/${p(r.r, 10)}`;
      }
      return `${p(n.l, 8)}*${p(n.r, 10)}`;
    }
    case "div":
      return `${p(n.l, 8)}/${p(n.r, 10)}`;
    case "pow":
      return `${p(n.l, 11)}^${p(n.r, 11)}`;
    case "neg":
      return `-${p(n.arg, 8)}`;
    case "fact":
      return `${p(n.arg, 11)}!`;
    case "pct":
      return `${p(n.arg, 11)}%`;
    case "call": {
      const args = n.args.map((a) => toNspire(a, o)).join(",");
      if (n.name === "sqrt") return `${o.ascii ? "sqrt" : "√"}(${args})`;
      const f = FUNCS[n.name];
      let name = f ? f.nspire : n.name;
      if (o.ascii && name.endsWith("⁻¹")) name = "arc" + name.slice(0, -2);
      return `${name}(${args})`;
    }
    case "rel":
      return `${p(n.l, 7)}${NSPIRE_REL[n.op][o.ascii ? 1 : 0]}${p(n.r, 7)}`;
    case "and":
      if (isChain(n))
        return `${p(n.l.l, 7)}${NSPIRE_REL[n.l.op][o.ascii ? 1 : 0]}${n.l.r.type === "var" ? n.l.r.name : ""}${NSPIRE_REL[n.r.op][o.ascii ? 1 : 0]}${p(n.r.r, 7)}`;
      return `${p(n.l, 4)} and ${p(n.r, 5)}`;
    case "or":
      return `${p(n.l, 3)} or ${p(n.r, 4)}`;
    case "not":
      return `not ${p(n.arg, 5)}`;
    case "list":
      return `{${n.items.map((x) => toNspire(x, o)).join(",")}}`;
    case "convert":
      return `${p(n.l, 2)}${o.ascii ? "@>" : "►"}${p(n.r, 3)}`;
    case "with":
      return `${p(n.l, 1)}|${p(n.r, 2)}`;
    case "assign":
      return n.params
        ? `${n.name}(${n.params.join(",")}):=${toNspire(n.body, o)}`
        : `${n.name}:=${toNspire(n.body, o)}`;
  }
}

// ---------- LaTeX ----------

const GREEK_TEX: Record<string, string> = {
  α: "\\alpha",
  β: "\\beta",
  γ: "\\gamma",
  δ: "\\delta",
  ε: "\\varepsilon",
  ζ: "\\zeta",
  η: "\\eta",
  θ: "\\theta",
  ι: "\\iota",
  κ: "\\kappa",
  λ: "\\lambda",
  μ: "\\mu",
  ν: "\\nu",
  ξ: "\\xi",
  ρ: "\\rho",
  σ: "\\sigma",
  τ: "\\tau",
  υ: "\\upsilon",
  φ: "\\varphi",
  χ: "\\chi",
  ψ: "\\psi",
  ω: "\\omega",
  Γ: "\\Gamma",
  Δ: "\\Delta",
  Θ: "\\Theta",
  Λ: "\\Lambda",
  Ξ: "\\Xi",
  Π: "\\Pi",
  Σ: "\\Sigma",
  Υ: "\\Upsilon",
  Φ: "\\Phi",
  Ψ: "\\Psi",
  Ω: "\\Omega",
  ℓ: "\\ell",
  ħ: "\\hbar",
};

function texSymbol(s: string): string | null {
  if (/^[a-zA-Z]$/.test(s)) return s;
  if (s in GREEK_TEX) return GREEK_TEX[s];
  if (s.length === 2 && s[0] === "Δ" && /[a-zA-Zα-ω]/.test(s[1])) return `\\Delta ${texSymbol(s[1])}`;
  return null;
}

export function texVar(name: string): string {
  const param = /^([nc])([0-9]+)$/.exec(name);
  if (param) return `${param[1]}_{${param[2]}}`;
  const [base, ...subs] = name.split("_");
  const sub = subs.join("_");
  const b = texSymbol(base) ?? `\\mathit{${base}}`;
  if (!sub) return b;
  const subTex = /^[a-zA-Z0-9]$/.test(sub)
    ? sub
    : (texSymbol(sub) ?? (/^[0-9]+$/.test(sub) ? sub : `\\mathrm{${sub}}`));
  return `${b}_{${subTex}}`;
}

const TEX_REL: Record<string, string> = { "=": "=", "≠": "\\neq", "<": "<", ">": ">", "≤": "\\leq", "≥": "\\geq" };

function isUnitExpr(n: Node): boolean {
  switch (n.type) {
    case "unit":
      return true;
    case "mul":
    case "div":
      return isUnitExpr(n.l) && isUnitExpr(n.r);
    case "pow":
      return isUnitExpr(n.l) && n.r.type !== "unit";
    case "num":
      return N.toF(n.value) === 1;
    default:
      return false;
  }
}

function startsWithDigit(s: string): boolean {
  return /^[0-9.]/.test(s) || /^\\frac\{[0-9]/.test(s) || s.startsWith("-");
}

/**
 * LaTeX for a single unit, in the plain editor style: `m`, `Hz`, `k\\Omega`, `\\mu m`, `^{\\circ}C`
 * (no `\\mathrm` wrapper). Numbers are joined to units with `\\ `, unit products with `\\cdot`.
 */
export function texUnit(name: string): string {
  const u = lookupNspire(name);
  if (!u) return name;
  // Physical constants keep \\mathrm so they stay distinct from variables (`\\mathrm{G}` vs `G`).
  return u.kind === "const" ? `\\mathrm{${u.tex}}` : u.tex;
}

/** A number already carrying a unit, e.g. `5_N` in `5_N*_m`. */
function isQuantityExpr(n: Node): boolean {
  return n.type === "mul" && isUnitExpr(n.r) && !isUnitExpr(n.l);
}

export function toLatex(n: Node, o: FormatOptions): string {
  const p = (x: Node, min: number) => {
    const s = toLatex(x, o);
    return prec(x, true, o.digits) < min ? `\\left(${s}\\right)` : s;
  };
  switch (n.type) {
    case "num": {
      const v = n.value;
      if (v.e) {
        if (v.d === 1n) return v.n.toString();
        const neg = v.n < 0n;
        return `${neg ? "-" : ""}\\frac{${neg ? -v.n : v.n}}{${v.d}}`;
      }
      const f = floatParts(v.v, o.digits);
      if (f.special) return f.special === "undef" ? "\\text{undef}" : f.special.replace("∞", "\\infty");
      return f.mant + (f.exp !== null ? `\\cdot 10^{${f.exp}}` : "");
    }
    case "var":
      return texVar(n.name);
    case "unit":
      return texUnit(n.name);
    case "const":
      return n.name === "π" ? "\\pi" : n.name === "e" ? "e" : "\\infty";
    case "bool":
      return n.value ? "\\text{true}" : "\\text{false}";
    case "add": {
      const r = n.r;
      if (r.type === "neg") return `${p(n.l, 7)}-${p(r.arg, 8)}`;
      if (r.type === "num" && N.sign(r.value) < 0)
        return `${p(n.l, 7)}-${toLatex({ type: "num", value: N.neg(r.value) }, o)}`;
      return `${p(n.l, 7)}+${p(n.r, 8)}`;
    }
    case "sub":
      return `${p(n.l, 7)}-${p(n.r, 8)}`;
    case "mul": {
      const l = p(n.l, 8);
      if (isUnitExpr(n.r)) {
        // Unit products need no grouping: `3\\ m^{2}\\cdot s`, `N\\cdot m`.
        const r = n.r.type === "mul" ? toLatex(n.r, o) : p(n.r, 9);
        if ((isUnitExpr(n.l) && n.l.type !== "num") || isQuantityExpr(n.l)) return `${l}\\cdot ${r}`;
        // Degree-style units attach directly: `25^{\\circ}C`, `30^{\\circ}`.
        return r.startsWith("^") ? `${l}${r}` : `${l}\\ ${r}`;
      }
      const r = p(n.r, 9);
      const lNum = n.l.type === "num" || (n.l.type === "pow" && n.l.l.type === "num");
      const rLetter =
        (n.r.type === "var" ||
          n.r.type === "const" ||
          (n.r.type === "call" && n.r.name !== "abs") ||
          (n.r.type === "pow" && n.r.l.type === "var")) &&
        !startsWithDigit(r);
      if (juxtaposable(n.l, true) && juxtaposable(n.r, false) && !startsWithDigit(r)) {
        return /\\[a-zA-Z]+$/.test(l) ? `${l} ${r}` : `${l}${r}`;
      }
      if (rLetter && n.r.type === "var" && isCoef(n.l) && n.l.type !== "num") return `${l} ${r}`;
      if (
        lNum &&
        rLetter &&
        n.l.type === "num" &&
        !(n.l.value.e && n.l.value.d !== 1n) &&
        !(!n.l.value.e && floatParts(n.l.value.v, o.digits).exp !== null)
      ) {
        return `${l}${r}`;
      }
      return `${l}\\cdot ${r}`;
    }
    case "div":
      if (isNegLeading(n.l)) return `-\\frac{${toLatex(stripNeg(n.l), o)}}{${toLatex(n.r, o)}}`;
      return `\\frac{${toLatex(n.l, o)}}{${toLatex(n.r, o)}}`;
    case "pow": {
      const base =
        n.l.type === "div" || (n.l.type === "num" && !n.l.value.e && floatParts(n.l.value.v, o.digits).exp !== null)
          ? `\\left(${toLatex(n.l, o)}\\right)`
          : p(n.l, 11);
      return `${base}^{${toLatex(n.r, o)}}`;
    }
    case "neg":
      return `-${p(n.arg, 8)}`;
    case "fact":
      return `${p(n.arg, 11)}!`;
    case "pct":
      return `${p(n.arg, 11)}\\%`;
    case "call": {
      const args = n.args.map((a) => toLatex(a, o));
      if (n.name === "sqrt") return `\\sqrt{${args[0]}}`;
      if (n.name === "root" && n.args.length === 2) return `\\sqrt[${args[1]}]{${args[0]}}`;
      if (n.name === "abs") return `\\left|${args[0]}\\right|`;
      if (n.name === "log") {
        const base = args.length > 1 ? args[1] : "10";
        return `\\log_{${base}}\\left(${args[0]}\\right)`;
      }
      if (n.name === "ncr" && args.length === 2) return `\\binom{${args[0]}}{${args[1]}}`;
      if (n.name === "system") return `\\begin{cases}${args.join("\\\\")}\\end{cases}`;
      if (n.name === "d" && args.length === 2) return `\\frac{d}{d${args[1]}}\\left(${args[0]}\\right)`;
      if ((n.name === "nint" || n.name === "integral") && args.length === 4)
        return `\\int_{${args[2]}}^{${args[3]}}${args[0]}\\,d${args[1]}`;
      if ((n.name === "sum" || n.name === "product") && args.length === 4)
        return `\\${n.name === "sum" ? "sum" : "prod"}_{${args[1]}=${args[2]}}^{${args[3]}}\\left(${args[0]}\\right)`;
      const f = FUNCS[n.name];
      const name = f?.tex ?? (/^[a-zA-Z]$/.test(n.name) ? n.name : `\\operatorname{${n.name}}`);
      return `${name}\\left(${args.join(",")}\\right)`;
    }
    case "rel":
      return `${p(n.l, 7)}${TEX_REL[n.op]}${p(n.r, 7)}`;
    case "and":
      if (isChain(n)) return `${p(n.l.l, 7)}${TEX_REL[n.l.op]}${toLatex(n.l.r, o)}${TEX_REL[n.r.op]}${p(n.r.r, 7)}`;
      return `${p(n.l, 4)}\\text{ and }${p(n.r, 5)}`;
    case "or":
      return `${p(n.l, 3)}\\text{ or }${p(n.r, 4)}`;
    case "not":
      return `\\neg ${p(n.arg, 5)}`;
    case "list":
      return `\\left\\{${n.items.map((x) => toLatex(x, o)).join(", ")}\\right\\}`;
    case "convert":
      return `${p(n.l, 2)}\\blacktriangleright ${p(n.r, 3)}`;
    case "with":
      return `${p(n.l, 1)}\\mid ${p(n.r, 2)}`;
    case "assign": {
      const head = n.params ? `${texVar(n.name)}\\left(${n.params.map(texVar).join(",")}\\right)` : texVar(n.name);
      return `${head}:=${toLatex(n.body, o)}`;
    }
  }
}
