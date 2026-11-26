import { Node, conjuncts, walk } from "./ast";
import { Algebra } from "./symbolic";
import { Env, EvalError, Settings, TEMP_ABS, UserFunc, Value, applyWith, evaluate, tempReading } from "./evaluate";
import * as N from "./num";
import { FormatOptions, approxNode, isExactNonInteger, numericValue, toLatex, toNspire, valueToNode } from "./format";
import { ParseError, parse } from "./parser";
import { freeVars, hasFloat, recognize } from "./solve";
import "./functions";
import { Dim, UnitDef, dimEq, isDimless, lookupNspire, unitsWithDim } from "./units";

export type { Settings, Value, UserFunc, AngleMode } from "./evaluate";
export { DEFAULT_SETTINGS } from "./evaluate";
export { UNITS } from "./units";
export type { UnitDef } from "./units";
export { texUnit } from "./format";

export interface Formatted {
  latex: string;
  nspire: string;
}

export interface CalcResult {
  ok: true;
  sourceFormat: "latex" | "nspire";
  input: Formatted;
  result: Formatted;
  /** Decimal approximation when the result is exact (fractions, surds, π). */
  approx?: Formatted;
  /** "input = result" ready to paste. */
  equation: Formatted;
  value?: Value;
  assignment?: { name: string; params?: string[]; body?: Node; source: string; value?: Value };
  solvedFor?: string[];
  notes: string[];
}

export interface CalcError {
  ok: false;
  error: string;
  sourceFormat?: "latex" | "nspire";
  input?: Formatted;
}

export interface Context {
  settings: Settings;
  vars: Map<string, Value>;
  funcs: Map<string, UserFunc>;
}

function fmt(n: Node, o: FormatOptions): Formatted {
  return { latex: toLatex(n, o), nspire: toNspire(n, o) };
}

function isEquationLike(n: Node): boolean {
  if (n.type === "rel") return true;
  if (n.type === "and") return isEquationLike(n.l) && isEquationLike(n.r);
  if (n.type === "list") return n.items.length > 0 && n.items.every(isEquationLike);
  if (n.type === "call" && n.name === "system") return n.args.length > 0 && n.args.every(isEquationLike);
  return false;
}

export function calculate(input: string, ctx: Context): CalcResult | CalcError {
  const o: FormatOptions = { digits: ctx.settings.digits, ascii: ctx.settings.nspireAscii };
  let parsed;
  try {
    parsed = parse(input, { exactDecimals: ctx.settings.mode === "exact", userFuncs: new Set(ctx.funcs.keys()) });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  const sourceFormat = parsed.latex ? "latex" : "nspire";
  let node = parsed.node;
  const inputFmt = fmt(node, { ...o, digits: 0 });
  const notes: string[] = [];
  const env: Env = { settings: ctx.settings, vars: ctx.vars, funcs: ctx.funcs, notes };
  try {
    let assignment: CalcResult["assignment"];
    let solvedFor: string[] | undefined;
    if (node.type === "assign") {
      const a = node;
      if (a.params) {
        const source = toNspire(a, { digits: 12 });
        const res = { type: "bool", value: true } as const;
        return {
          ok: true,
          sourceFormat,
          input: inputFmt,
          result: { latex: "\\text{Done}", nspire: "Done" },
          equation: inputFmt,
          assignment: { name: a.name, params: a.params, body: a.body, source },
          notes: [`Defines ${a.name}(${a.params.join(",")})`],
          value: { k: "bool", v: res.value },
        };
      }
      node = a.body;
      assignment = { name: a.name, source: "" };
    }

    // An equation with unknowns is solved automatically, like typing solve(...) around it.
    if (isEquationLike(node) || (node.type === "with" && isEquationLike(node.l))) {
      const eqPart = node.type === "with" ? node.l : node;
      const fv = freeVars(node, env);
      if (fv.length) {
        const varsNode: Node =
          fv.length === 1
            ? { type: "var", name: fv[0] }
            : { type: "list", items: fv.map((name) => ({ type: "var", name })) };
        const eqCount =
          eqPart.type === "list"
            ? eqPart.items.length
            : eqPart.type === "call"
              ? eqPart.args.length
              : eqPart.type === "and"
                ? conjuncts(eqPart).length
                : 1;
        if (fv.length > eqCount) {
          throw new EvalError(
            `More unknowns (${fv.join(", ")}) than equations: use solve(…, ${fv[fv.length - 1]}) to pick one`,
          );
        }
        const call: Node = { type: "call", name: "solve", args: [eqPart, varsNode] };
        node = node.type === "with" ? { ...node, l: call } : call;
        solvedFor = fv;
      }
    } else if (freeVars(node, env).length) {
      // Expressions with unknown letters are simplified symbolically, like the Nspire CAS (a+a → 2*a).
      const inner = node.type === "with" ? applyWith(node.r, env) : env;
      const expr = node.type === "with" ? node.l : node;
      const alg = new Algebra(inner);
      const simplified = alg.toNode(alg.from(expr));
      const result = fmt(simplified, o);
      return {
        ok: true,
        sourceFormat,
        input: inputFmt,
        result,
        equation: fmt(equationNode(parsed.node, simplified), o),
        value: { k: "expr", node: simplified },
        notes,
      };
    }

    const value = tempReading(node, env) ?? evaluate(node, env);
    if (value.k === "q" && !value.disp && Number.isNaN(numericValue({ type: "num", value: value.num }) ?? 0)) {
      throw new EvalError("Non-real or undefined result");
    }
    let resNode = valueToNode(value, ctx.settings);
    // Recognize simple exact forms of decimal results (√8 → 2√2, π/2, ln(2)) when the input was exact.
    if (
      value.k === "q" &&
      !value.num.e &&
      !value.disp &&
      isDimless(value.dim) &&
      ctx.settings.mode !== "approx" &&
      !hasFloat(node, env) &&
      !containsCall(node, "nsolve") &&
      !containsCall(node, "nderiv")
    ) {
      const ex = recognize(value.num.v);
      if (ex) resNode = ex;
    }
    const result = fmt(resNode, o);
    let approx: Formatted | undefined;
    if (ctx.settings.mode !== "approx" && isExactNonInteger(resNode)) {
      const a = approxNode(resNode);
      const af = fmt(a, o);
      if (af.nspire !== result.nspire) approx = af;
    }
    if (assignment)
      assignment = { ...assignment, value, source: `${toNspire(resNode, { digits: 15 })}→${assignment.name}` };
    const showEq = solvedFor ? result : fmt(equationNode(parsed.node, resNode), o);
    return {
      ok: true,
      sourceFormat,
      input: inputFmt,
      result,
      approx,
      equation: showEq,
      value,
      assignment,
      solvedFor,
      notes,
    };
  } catch (e) {
    const msg =
      e instanceof EvalError || e instanceof ParseError
        ? e.message
        : e instanceof Error
          ? `Error: ${e.message}`
          : String(e);
    return { ok: false, error: msg, sourceFormat, input: inputFmt };
  }
}

function containsCall(n: Node, name: string): boolean {
  let found = false;
  walk(n, (x) => {
    if (x.type === "call" && x.name === name) found = true;
  });
  return found;
}

function equationNode(input: Node, result: Node): Node {
  if (input.type === "assign") return input;
  return { type: "rel", op: "=", l: input, r: result };
}

export interface Conversion {
  unit: UnitDef;
  result: Formatted;
}

/** Common conversions of a result with units (like the Nspire ► menu for that dimension). */
export function suggestConversions(value: Value | undefined, ctx: Context, limit = Infinity): Conversion[] {
  if (!value || value.k !== "q" || isDimless(value.dim)) return [];
  const o: FormatOptions = { digits: ctx.settings.digits, ascii: ctx.settings.nspireAscii };
  const dim: Dim = value.dim;
  const current = value.disp?.unit.type === "unit" ? value.disp.unit.name : undefined;
  return unitsWithDim(dim)
    .filter((u) => u.nspire !== current && dimEq(u.dim, dim))
    .slice(0, limit)
    .map((u) => {
      // Absolute temperatures (a plain 20_°C) convert with the scale's offset.
      const abs = value.disp?.abs && u.nspire in TEMP_ABS;
      const n = abs ? N.sub(divNum(value, u), TEMP_ABS[u.nspire].offset) : divNum(value, u);
      const num = { ...value, disp: { unit: { type: "unit", name: u.nspire } as Node, num: n, abs } };
      return { unit: u, result: fmt(valueToNode(num, ctx.settings), o) };
    });
}

function divNum(value: Extract<Value, { k: "q" }>, u: UnitDef) {
  const unit = lookupNspire(u.nspire)!;
  const v = value.num;
  if (v.e && unit.factor.e) {
    const n = v.n * unit.factor.d,
      d = v.d * unit.factor.n;
    return ratOrFloat(n, d);
  }
  const fv = v.e ? Number(v.n) / Number(v.d) : v.v;
  const ff = unit.factor.e ? Number(unit.factor.n) / Number(unit.factor.d) : unit.factor.v;
  return { e: false as const, v: fv / ff };
}

function ratOrFloat(n: bigint, d: bigint) {
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  let a = n < 0n ? -n : n,
    b = d;
  while (b) [a, b] = [b, a % b];
  return { e: true as const, n: n / a, d: d / a };
}

/** Converts between LaTeX and Nspire text without evaluating. */
export function translate(input: string, ctx: Context): (Formatted & { sourceFormat: "latex" | "nspire" }) | CalcError {
  try {
    const p = parse(input, { userFuncs: new Set(ctx.funcs.keys()) });
    const o: FormatOptions = { digits: 0, ascii: ctx.settings.nspireAscii };
    return { ...fmt(p.node, o), sourceFormat: p.latex ? "latex" : "nspire" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
