/**
 * solver.ts — a small symbolic equation solver for ONE unknown.
 *
 * The unknown can be a single letter (x, y, z, ...) or a multi-letter
 * name like Va, VA, Vout or x1 — a run of letters/digits starting with
 * a letter is one variable name, which suits circuit work (node
 * voltages Va, Vb, ...). Names match case-insensitively.
 * Supported:
 *   - linear and quadratic equations        e.g. x+15=20,  y^2-5y+6=0
 *   - + - * / ^ and parentheses              e.g. 3(x+2)=21,  30=x/15
 *   - implicit multiplication                e.g. 2x, 3(x+2), (x+1)(x-1)
 *   - decimals and fractions                 e.g. 0.5x=1.5, x/15=2
 *   - the unknown in a denominator           e.g. 1/5=3/x,  (x+1)/(x-1)=2
 *     (denominators are cleared; roots that would make a denominator 0
 *      are rejected as extraneous)
 * Not supported (yet):
 *   - more than one distinct unknown         e.g. x+y=10
 *   - degree 3 or higher after clearing denominators
 *   - variable exponents, roots / trig / logs
 *
 * How it works: each side of the equation is parsed into a rational
 * expression — a polynomial divided by a polynomial ([c0, c1, c2] means
 * c0 + c1·v + c2·v²). Subtracting the right side from the left gives
 * N(v) / D(v) = 0, which holds exactly when N(v) = 0 and D(v) ≠ 0.
 * N(v) = 0 is the standard form a·v² + b·v + c = 0, solved directly
 * (linear formula / quadratic formula), so the "steps" shown to the user
 * are the real algebra, not a numeric guess.
 */

export type SolveResult =
  | {
      ok: true;
      /** The unknown, exactly as the user typed it (e.g. "x", "y", "Z"). */
      variable: string;
      kind: "unique" | "two" | "double" | "infinite" | "none" | "complex";
      /** Human-readable solutions, e.g. ["5"], ["2", "3"], ["15/4 = 3.75"]. */
      solutions: string[];
      /** One-line answer ready to copy, e.g. "x = 5" or "x = 2 or x = 3". */
      answerText: string;
      /** Standard form, e.g. "x - 5 = 0" or "(x - 15) / (5x) = 0". */
      standardForm: string;
      /** Algebra steps, in order. */
      steps: string[];
    }
  | { ok: false; error: string };

const EPS = 1e-12;

/* ------------------------------------------------------------------ */
/* Number formatting                                                   */
/* ------------------------------------------------------------------ */

/** Plain decimal, trimmed: 3.75, -2, 0.3333333333 */
export function formatDecimal(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Math.abs(n) < EPS) return "0";
  if (Math.abs(n - Math.round(n)) < 1e-10) return String(Math.round(n));
  return String(parseFloat(n.toPrecision(10)));
}

/** Fraction if there is a tidy one, else a plain decimal: "15/4", "0.3333333333". */
export function formatFractionOrDecimal(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Math.abs(n) < EPS) return "0";
  if (Math.abs(n - Math.round(n)) < 1e-10) return String(Math.round(n));
  for (let d = 2; d <= 100; d++) {
    const p = Math.round(n * d);
    if (Math.abs(p / d - n) < 1e-10) return `${p}/${d}`;
  }
  return formatDecimal(n);
}

/** Rich format for final answers: prefers an exact small fraction, e.g. "15/4 = 3.75". */
export function formatAnswer(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Math.abs(n) < EPS) return "0";
  if (Math.abs(n - Math.round(n)) < 1e-10) return String(Math.round(n));
  for (let d = 2; d <= 100; d++) {
    const p = Math.round(n * d);
    if (Math.abs(p / d - n) < 1e-10) {
      return `${p}/${d} = ${formatDecimal(n)}`;
    }
  }
  return formatDecimal(n);
}

/* ------------------------------------------------------------------ */
/* Polynomials: number[] where index = power of the unknown            */
/* ------------------------------------------------------------------ */

type Poly = number[];

function trimPoly(p: Poly): Poly {
  const out = [...p];
  while (out.length > 1 && Math.abs(out[out.length - 1]) < EPS) out.pop();
  return out.length === 0 ? [0] : out;
}

function polyDegree(p: Poly): number {
  const t = trimPoly(p);
  return t.length - 1;
}

function isZeroPoly(p: Poly): boolean {
  return trimPoly(p).every((c) => Math.abs(c) < EPS);
}

function isConstantOne(p: Poly): boolean {
  const t = trimPoly(p);
  return t.length === 1 && Math.abs(t[0] - 1) < EPS;
}

function addPoly(a: Poly, b: Poly): Poly {
  const len = Math.max(a.length, b.length);
  const out: Poly = new Array(len).fill(0);
  for (let i = 0; i < len; i++) out[i] = (a[i] ?? 0) + (b[i] ?? 0);
  return trimPoly(out);
}

function subPoly(a: Poly, b: Poly): Poly {
  return addPoly(
    a,
    b.map((c) => -c),
  );
}

function mulPoly(a: Poly, b: Poly): Poly {
  if (isZeroPoly(a) || isZeroPoly(b)) return [0];
  const out: Poly = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      out[i + j] += a[i] * b[j];
    }
  }
  return trimPoly(out);
}

function powPoly(base: Poly, e: number): Poly {
  let out: Poly = [1];
  for (let i = 0; i < e; i++) out = mulPoly(out, base);
  return out;
}

function evalPoly(p: Poly, v: number): number {
  let sum = 0;
  for (let i = 0; i < p.length; i++) sum += (p[i] ?? 0) * Math.pow(v, i);
  return sum;
}

/** True when v (a candidate root) would make this denominator polynomial 0. */
function isZeroAt(p: Poly, v: number): boolean {
  let bound = 0;
  for (let i = 0; i < p.length; i++) bound += Math.abs(p[i] ?? 0) * Math.pow(Math.max(1, Math.abs(v)), i);
  return Math.abs(evalPoly(p, v)) <= 1e-6 * Math.max(1, bound);
}

/** Real roots of a polynomial of degree ≤ 2, or null when the degree is higher. */
function realRootsOf(p: Poly): number[] | null {
  const t = trimPoly(p);
  const deg = t.length - 1;
  if (deg <= 0) return [];
  if (deg === 1) return [-(t[0] ?? 0) / t[1]];
  if (deg === 2) {
    const a = t[2];
    const b = t[1] ?? 0;
    const c = t[0] ?? 0;
    const d = b * b - 4 * a * c;
    if (d < -EPS) return [];
    if (Math.abs(d) <= EPS) return [-b / (2 * a)];
    const s = Math.sqrt(d);
    return [(-b + s) / (2 * a), (-b - s) / (2 * a)];
  }
  return null;
}

/** One term of a polynomial as text, e.g. "3x²", "-x", "5". Returns "" for a zero term. */
function termToString(coeff: number, power: number, variable: string): string {
  if (Math.abs(coeff) < EPS) return "";
  const superscripts: Record<string, string> = { "2": "²", "3": "³" };
  const varPart =
    power === 0 ? "" : power === 1 ? variable : `${variable}${superscripts[String(power)] ?? `^${power}`}`;
  if (power === 0) return formatDecimal(coeff);
  if (Math.abs(coeff - 1) < EPS) return varPart;
  if (Math.abs(coeff + 1) < EPS) return `-${varPart}`;
  return `${formatDecimal(coeff)}${varPart}`;
}

export function polyToString(p: Poly, variable: string): string {
  const t = trimPoly(p);
  const parts: string[] = [];
  for (let power = t.length - 1; power >= 0; power--) {
    const term = termToString(t[power], power, variable);
    if (!term) continue;
    if (parts.length === 0) {
      parts.push(term);
    } else if (term.startsWith("-")) {
      parts.push(`- ${term.slice(1)}`);
    } else {
      parts.push(`+ ${term}`);
    }
  }
  return parts.length === 0 ? "0" : parts.join(" ");
}

/* ------------------------------------------------------------------ */
/* Rational expressions: a polynomial divided by a polynomial          */
/* ------------------------------------------------------------------ */

interface Rat {
  num: Poly;
  den: Poly;
}

function gcdInt(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

function makeRat(num: Poly, den: Poly = [1]): Rat {
  let n = trimPoly(num);
  let d = trimPoly(den);
  if (isZeroPoly(d)) throw new Error("Division by zero.");
  // Cancel a common whole-number factor so steps stay tidy:
  // (-125Va + 1250) / 250 displays as (-Va + 10) / 2.
  const all = [...n, ...d];
  if (all.every((c) => Math.abs(c - Math.round(c)) < 1e-9)) {
    let g = 0;
    for (const c of all) g = gcdInt(g, Math.round(c));
    if (g > 1) {
      n = n.map((c) => c / g);
      d = d.map((c) => c / g);
    }
  }
  // Note: the denominator is kept even when the numerator is 0 — the
  // expression is still undefined where its denominator is 0, and the
  // solver needs those excluded values (e.g. 5/(x-2) = 5/(x-2) holds
  // for every x except 2).
  // Keep the denominator's leading coefficient positive, for tidy display.
  if (d[d.length - 1] < 0) {
    return { num: n.map((c) => -c), den: d.map((c) => -c) };
  }
  return { num: n, den: d };
}

function negRat(a: Rat): Rat {
  return makeRat(
    a.num.map((c) => -c),
    a.den,
  );
}

function addRat(a: Rat, b: Rat): Rat {
  return makeRat(addPoly(mulPoly(a.num, b.den), mulPoly(b.num, a.den)), mulPoly(a.den, b.den));
}

function subRat(a: Rat, b: Rat): Rat {
  return makeRat(subPoly(mulPoly(a.num, b.den), mulPoly(b.num, a.den)), mulPoly(a.den, b.den));
}

function mulRat(a: Rat, b: Rat): Rat {
  return makeRat(mulPoly(a.num, b.num), mulPoly(a.den, b.den));
}

function divRat(a: Rat, b: Rat): Rat {
  if (isZeroPoly(b.num)) throw new Error("Division by zero.");
  return makeRat(mulPoly(a.num, b.den), mulPoly(a.den, b.num));
}

function powRat(base: Rat, exponent: Rat): Rat {
  const eNum = trimPoly(exponent.num);
  const eDen = trimPoly(exponent.den);
  if (polyDegree(eNum) > 0 || polyDegree(eDen) > 0) {
    throw new Error("Variable exponents aren't supported (e.g. 2^x).");
  }
  const e = (eNum[0] ?? 0) / (eDen[0] ?? 1);
  if (!Number.isInteger(e)) throw new Error("Only whole-number powers are supported (e.g. x^2).");
  if (Math.abs(e) > 10) throw new Error("That power is too large (max ^10).");
  if (e >= 0) return makeRat(powPoly(base.num, e), powPoly(base.den, e));
  if (isZeroPoly(base.num)) throw new Error("Division by zero.");
  return makeRat(powPoly(base.den, -e), powPoly(base.num, -e));
}

function ratToString(r: Rat, variable: string): string {
  const numStr = polyToString(r.num, variable);
  if (isConstantOne(r.den)) return numStr;
  return `(${numStr}) / (${polyToString(r.den, variable)})`;
}

/* ------------------------------------------------------------------ */
/* Tokenizer                                                           */
/* ------------------------------------------------------------------ */

type Token =
  | { type: "number"; value: number }
  | { type: "variable"; name: string }
  | { type: "op"; value: "+" | "-" | "*" | "/" | "^" }
  | { type: "lparen" }
  | { type: "rparen" };

function normalizeInput(raw: string): string {
  return raw
    .replace(/[×✕·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–—]/g, "-")
    .replace(/＝/g, "=")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/\s+/g, "");
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/[0-9.]/.test(ch)) {
      let text = "";
      let dots = 0;
      while (i < input.length && /[0-9.]/.test(input[i])) {
        if (input[i] === ".") dots++;
        text += input[i];
        i++;
      }
      if (dots > 1 || text === ".") throw new Error(`"${text}" isn't a valid number.`);
      tokens.push({ type: "number", value: parseFloat(text) });
    } else if (/[a-zA-Z]/.test(ch)) {
      // A variable name: a letter, then letters/digits/underscores (Va, Vout, x1, V_A).
      let name = "";
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        name += input[i];
        i++;
      }
      tokens.push({ type: "variable", name });
    } else if (ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "^") {
      tokens.push({ type: "op", value: ch });
      i++;
    } else if (ch === "(") {
      tokens.push({ type: "lparen" });
      i++;
    } else if (ch === ")") {
      tokens.push({ type: "rparen" });
      i++;
    } else {
      throw new Error(`Unsupported character "${ch}".`);
    }
  }
  return tokens;
}

/* ------------------------------------------------------------------ */
/* Recursive-descent parser → rational expression                      */
/* ------------------------------------------------------------------ */

class Parser {
  private pos = 0;
  private tokens: Token[];
  /** Lower-cased unknown, e.g. "x". Variable tokens are matched case-insensitively. */
  private variableKey: string;

  constructor(tokens: Token[], variableKey: string) {
    this.tokens = tokens;
    this.variableKey = variableKey;
  }

  parse(): Rat {
    const result = this.parseExpression();
    if (this.pos < this.tokens.length) {
      throw new Error("Couldn't understand the end of that expression — check brackets and operators.");
    }
    return result;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private next(): Token | undefined {
    return this.tokens[this.pos++];
  }

  private parseExpression(): Rat {
    let left = this.parseTerm();
    for (;;) {
      const t = this.peek();
      if (t?.type === "op" && (t.value === "+" || t.value === "-")) {
        this.next();
        const right = this.parseTerm();
        left = t.value === "+" ? addRat(left, right) : subRat(left, right);
      } else {
        return left;
      }
    }
  }

  private parseTerm(): Rat {
    let left = this.parseUnary();
    for (;;) {
      const t = this.peek();
      if (t?.type === "op" && t.value === "*") {
        this.next();
        left = mulRat(left, this.parseUnary());
      } else if (t?.type === "op" && t.value === "/") {
        this.next();
        left = divRat(left, this.parseUnary());
      } else if (t?.type === "number" || t?.type === "variable" || t?.type === "lparen") {
        // Implicit multiplication: 2x, 3(x+2), (x+1)(x-1)
        left = mulRat(left, this.parseUnary());
      } else {
        return left;
      }
    }
  }

  private parseUnary(): Rat {
    const t = this.peek();
    if (t?.type === "op" && t.value === "-") {
      this.next();
      return negRat(this.parseUnary());
    }
    if (t?.type === "op" && t.value === "+") {
      this.next();
      return this.parseUnary();
    }
    return this.parsePower();
  }

  private parsePower(): Rat {
    const base = this.parsePrimary();
    const t = this.peek();
    if (t?.type === "op" && t.value === "^") {
      this.next();
      const exponent = this.parseUnary();
      return powRat(base, exponent);
    }
    return base;
  }

  private parsePrimary(): Rat {
    const t = this.next();
    if (!t) throw new Error("That expression ends unexpectedly — is something missing after an operator?");
    if (t.type === "number") return makeRat([t.value]);
    if (t.type === "variable") {
      if (t.name.toLowerCase() !== this.variableKey) {
        throw new Error(`Found more than one unknown — this solver handles one unknown at a time.`);
      }
      return makeRat([0, 1]);
    }
    if (t.type === "lparen") {
      const inner = this.parseExpression();
      const closing = this.next();
      if (closing?.type !== "rparen") throw new Error('Missing a closing bracket ")".');
      return inner;
    }
    throw new Error('Expected a number, the unknown, or "(".');
  }
}

/* ------------------------------------------------------------------ */
/* Solving a polynomial equation p(v) = 0 (degree ≤ 2)                 */
/* ------------------------------------------------------------------ */

interface PolyCore {
  kind: "unique" | "two" | "double" | "infinite" | "none" | "complex";
  /** Formatted solutions, parallel to numericSolutions for real roots. */
  solutions: string[];
  /** Raw numeric roots (unique / two / double only; empty otherwise). */
  numericSolutions: number[];
  /** Steps after the opening "combine / clear denominators" step. */
  steps: string[];
}

function solvePolynomialCore(p: Poly, variable: string): PolyCore {
  const poly = trimPoly(p);
  const deg = polyDegree(poly);
  if (deg > 2) {
    throw new Error(`That works out to degree ${deg} — only linear and quadratic equations are supported for now.`);
  }

  if (deg === 0) {
    const c = poly[0] ?? 0;
    if (Math.abs(c) < EPS) {
      return {
        kind: "infinite",
        solutions: ["any real number"],
        numericSolutions: [],
        steps: [`It reduces to 0 = 0, so it holds for every value of ${variable} where the equation is defined.`],
      };
    }
    return {
      kind: "none",
      solutions: [],
      numericSolutions: [],
      steps: [`It reduces to ${formatDecimal(c)} = 0, which is never true — so there is no solution.`],
    };
  }

  if (deg === 1) {
    const b = poly[1];
    const c = poly[0] ?? 0;
    const value = -c / b;
    const answer = formatAnswer(value);
    const steps: string[] = [];
    if (Math.abs(c) >= EPS) {
      const moveVerb = c > 0 ? "Subtract" : "Add";
      steps.push(
        `${moveVerb} ${formatDecimal(Math.abs(c))} on both sides: ${termToString(b, 1, variable)} = ${formatDecimal(-c)}`,
      );
    }
    if (Math.abs(b - 1) >= EPS) {
      steps.push(`Divide both sides by ${formatDecimal(b)}: ${variable} = ${answer}`);
    } else if (Math.abs(c) < EPS) {
      steps.push(`So ${variable} = ${answer}`);
    }
    return {
      kind: "unique",
      solutions: [answer],
      numericSolutions: [value],
      steps,
    };
  }

  const a = poly[2];
  const b = poly[1] ?? 0;
  const c = poly[0] ?? 0;
  const discriminant = b * b - 4 * a * c;
  const steps = [
    `Here a = ${formatDecimal(a)}, b = ${formatDecimal(b)}, c = ${formatDecimal(c)}`,
    `Discriminant: b² − 4ac = ${formatDecimal(b)}² − 4·${formatDecimal(a)}·${formatDecimal(c)} = ${formatDecimal(discriminant)}`,
  ];

  if (discriminant > EPS) {
    const sqrtD = Math.sqrt(discriminant);
    const r1 = (-b + sqrtD) / (2 * a);
    const r2 = (-b - sqrtD) / (2 * a);
    const s1 = formatAnswer(r1);
    const s2 = formatAnswer(r2);
    steps.push(`Quadratic formula: ${variable} = (−b ± √${formatDecimal(discriminant)}) / 2a = ${s1} or ${s2}`);
    return {
      kind: "two",
      solutions: [s1, s2],
      numericSolutions: [r1, r2],
      steps,
    };
  }

  if (Math.abs(discriminant) <= EPS) {
    const r = -b / (2 * a);
    const s = formatAnswer(r);
    steps.push(`The discriminant is 0, so there is one repeated root: ${variable} = −b / 2a = ${s}`);
    return { kind: "double", solutions: [s], numericSolutions: [r], steps };
  }

  const real = -b / (2 * a);
  const imag = Math.sqrt(-discriminant) / Math.abs(2 * a);
  const complex1 = `${formatDecimal(real)} + ${formatDecimal(imag)}i`;
  const complex2 = `${formatDecimal(real)} − ${formatDecimal(imag)}i`;
  steps.push(
    `The discriminant is negative, so there are no real solutions (complex roots: ${complex1} and ${complex2}).`,
  );
  return {
    kind: "complex",
    solutions: [complex1, complex2],
    numericSolutions: [],
    steps,
  };
}

/* ------------------------------------------------------------------ */
/* Solving an equation                                                 */
/* ------------------------------------------------------------------ */

export function solveEquation(rawInput: string): SolveResult {
  try {
    return solveUnsafe(rawInput);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Couldn't solve that equation.",
    };
  }
}

function solveUnsafe(rawInput: string): SolveResult {
  const input = normalizeInput(rawInput);
  if (!input) throw new Error("Type an equation first, e.g. x+15=20.");

  const sides = input.split("=");
  if (sides.length !== 2 || !sides[0] || !sides[1]) {
    throw new Error('An equation needs exactly one "=" with something on both sides, e.g. x+15=20.');
  }

  // Find the unknown(s) from the variable tokens on both sides.
  const lhsTokens = tokenize(sides[0]);
  const rhsTokens = tokenize(sides[1]);
  const distinct = new Map<string, string>(); // lower-case name -> as typed
  for (const token of [...lhsTokens, ...rhsTokens]) {
    if (token.type === "variable" && !distinct.has(token.name.toLowerCase()))
      distinct.set(token.name.toLowerCase(), token.name);
  }
  if (distinct.size === 0) {
    throw new Error(
      "No unknown found — an equation needs a variable to solve for, e.g. x in x+15=20 or Va in (20-Va)/10=1.",
    );
  }
  if (distinct.size > 1) {
    const names = [...distinct.values()].join(", ");
    throw new Error(`Found ${distinct.size} unknowns (${names}) — this solver handles one unknown at a time.`);
  }
  const variableKey = [...distinct.keys()][0];
  const variable = distinct.get(variableKey) as string;

  const lhs = new Parser(lhsTokens, variableKey).parse();
  const rhs = new Parser(rhsTokens, variableKey).parse();
  const diff = subRat(lhs, rhs);
  const hasDenominator = !isConstantOne(diff.den);
  const standardForm = `${ratToString(diff, variable)} = 0`;

  // Values that would make a denominator 0 are never allowed.
  const excludedRoots = hasDenominator ? realRootsOf(diff.den) : [];
  const excludedList =
    excludedRoots && excludedRoots.length > 0 ? excludedRoots.map((r) => formatFractionOrDecimal(r)).join(", ") : null;

  const leadSteps: string[] = [];
  if (!hasDenominator) {
    leadSteps.push(`Combine both sides into one equation: ${standardForm}`);
  } else {
    leadSteps.push(`Combine into a single fraction: ${standardForm}`);
    if (excludedList) {
      leadSteps.push(`A denominator can't be 0, so ${variable} ≠ ${excludedList}.`);
    }
    leadSteps.push(`A fraction is 0 exactly when its top is 0, so solve: ${polyToString(diff.num, variable)} = 0`);
  }

  const core = solvePolynomialCore(diff.num, variable);
  const steps = [...leadSteps, ...core.steps];

  // Reject candidate roots that make a denominator 0 (extraneous roots).
  let kind = core.kind;
  let solutions = core.solutions;
  if (hasDenominator && (kind === "unique" || kind === "two" || kind === "double")) {
    const kept: string[] = [];
    core.numericSolutions.forEach((value, i) => {
      if (isZeroAt(diff.den, value)) {
        steps.push(
          `${variable} = ${core.solutions[i]} is rejected — it makes a denominator 0 in the original equation.`,
        );
      } else {
        kept.push(core.solutions[i]);
      }
    });
    if (kept.length === 0) {
      kind = "none";
      solutions = [];
    } else {
      if (kind === "two" && kept.length === 1) kind = "unique";
      solutions = kept;
    }
  }

  let answerText: string;
  switch (kind) {
    case "unique":
      answerText = `${variable} = ${solutions[0]}`;
      break;
    case "two":
      answerText = `${variable} = ${solutions[0]} or ${variable} = ${solutions[1]}`;
      break;
    case "double":
      answerText = `${variable} = ${solutions[0]} (repeated root)`;
      break;
    case "infinite":
      answerText = excludedList
        ? `${variable} can be any real number except ${excludedList}`
        : `${variable} can be any real number`;
      if (excludedList) solutions = [`any real number except ${excludedList}`];
      break;
    case "complex":
      answerText = `No real solution (${variable} = ${solutions[0]} or ${variable} = ${solutions[1]})`;
      break;
    default:
      answerText = "No solution";
  }

  return {
    ok: true,
    variable,
    kind,
    solutions,
    answerText,
    standardForm,
    steps,
  };
}
