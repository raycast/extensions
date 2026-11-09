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
 *
 * Robustness notes:
 *   - Every denominator that appears while parsing is remembered in
 *     Rat.excl, because simplification can cancel one away (x/(1/x)
 *     becomes x²) while the value is still excluded from the domain.
 *   - Zero tests and the discriminant are judged relative to the scale
 *     of the numbers involved, and the numerator is scaled to a leading
 *     coefficient of 1 before solving — an equation multiplied by a tiny
 *     or huge constant solves exactly like the original.
 *   - Quadratic roots use the numerically stable q-form, so a small
 *     root next to a huge one (x² + 1000000000x + 1) is not lost.
 *   - Intermediate polynomial degrees are capped (MAX_DEGREE), so
 *     nested powers fail fast instead of expanding forever.
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

/**
 * Trailing-coefficient trim threshold for polynomials. Deliberately much
 * smaller than EPS: a coefficient like the 0.0000000000005 in
 * 0.0000000000005x = 1 is genuine user input, not rounding residue, and
 * trimming it away would change the answer.
 */
const TRIM_EPS = 1e-13;

/**
 * Relative bound for judging a discriminant as zero. The discriminant
 * b² - 4c is computed with a rounding error of a few ulps of its scale
 * (~1e-15 relative), so 1e-13 leaves two orders of magnitude of margin
 * while still preserving genuine small discriminants at large scales
 * (x² - 2000000x + 999999999999 has discriminant exactly 4 at scale 8e12).
 */
const DISC_REL_EPS = 1e-13;

/** Intermediate polynomials are capped well below any size that could stall the UI. */
const MAX_DEGREE = 100;

/* ------------------------------------------------------------------ */
/* Number formatting                                                   */
/* ------------------------------------------------------------------ */

/**
 * Expand a scientific-notation string ("1.600000000e-10") into plain
 * decimal ("0.00000000016"), keeping every significant digit. A fixed
 * number of decimal places (toFixed(10)) would round 1.6e-10 up to
 * 0.0000000002 — a 25% error — so the digits are moved, not recomputed.
 * Returns null for large exponents, where scientific form is left as is.
 */
function expandScientific(s: string): string | null {
  const m = /^(-?)(\d+)(?:\.(\d+))?e([+-]?\d+)$/.exec(s);
  if (!m) return null;
  const exp = parseInt(m[4], 10);
  if (exp >= 0) return null;
  const digits = (m[2] + (m[3] ?? "")).replace(/0+$/, "");
  if (digits === "") return "0";
  return `${m[1]}0.${"0".repeat(-exp - 1)}${digits}`;
}

/** Plain decimal, trimmed: 3.75, -2, 0.3333333333 */
export function formatDecimal(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Math.abs(n) < EPS) return "0";
  if (Math.abs(n - Math.round(n)) < 1e-10) return String(Math.round(n));
  const precise = n.toPrecision(10);
  // Avoid scientific notation for small magnitudes: -0.000000001, not -1e-9.
  if (precise.includes("e") && Math.abs(n) < 1e-4) {
    const expanded = expandScientific(precise);
    if (expanded !== null) return expanded;
  }
  return String(parseFloat(precise));
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
  while (out.length > 1 && Math.abs(out[out.length - 1]) < TRIM_EPS) out.pop();
  return out.length === 0 ? [0] : out;
}

function polyDegree(p: Poly): number {
  const t = trimPoly(p);
  return t.length - 1;
}

function isZeroPoly(p: Poly): boolean {
  // Exact zero only: a tiny-but-genuine coefficient (0.0000000000005x)
  // must not be mistaken for zero. Residue-scale values are handled by
  // the EPS checks where equations are classified, not here.
  return trimPoly(p).every((c) => c === 0);
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
  if (polyDegree(a) + polyDegree(b) > MAX_DEGREE) {
    throw new Error(`That expression expands beyond degree ${MAX_DEGREE} — too complex for this solver.`);
  }
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

/**
 * True when v (a candidate root) would make this denominator polynomial 0.
 * The test is relative to the size of the terms at v: a small but genuine
 * denominator like (x − 0.000001) at x = 0 must NOT count as zero.
 */
function isZeroAt(p: Poly, v: number): boolean {
  let value = 0;
  let scale = 0;
  for (let i = 0; i < p.length; i++) {
    const term = (p[i] ?? 0) * Math.pow(v, i);
    value += term;
    scale += Math.abs(term);
  }
  if (scale === 0) return true;
  return Math.abs(value) <= 1e-9 * scale;
}

/**
 * Real roots of a polynomial of degree ≤ 2, or null when the degree is
 * higher. The polynomial is first scaled to a leading coefficient of 1,
 * so the discriminant test is relative and tiny-but-genuine coefficients
 * (e.g. every term scaled by 0.0000001) are judged correctly.
 */
function realRootsOf(p: Poly): number[] | null {
  const t = trimPoly(p);
  const deg = t.length - 1;
  if (deg <= 0) return [];
  const lead = t[deg];
  if (deg === 1) return [-(t[0] ?? 0) / lead];
  if (deg === 2) {
    const b = (t[1] ?? 0) / lead;
    const c = (t[0] ?? 0) / lead;
    const d = b * b - 4 * c;
    const dScale = b * b + 4 * Math.abs(c);
    if (d < -DISC_REL_EPS * dScale) return [];
    if (Math.abs(d) <= DISC_REL_EPS * dScale) return [-b / 2];
    const s = Math.sqrt(d);
    // Numerically stable form: one root from q, the other from c / q.
    const q = -0.5 * (b + (b >= 0 ? s : -s));
    return [q, c / q];
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
  /**
   * Denominator polynomials from every sub-expression, kept separately.
   * Simplification can cancel a denominator out of num/den (x/(1/x)
   * simplifies to x²), but the original expression is still undefined
   * where any of these is 0 — so the exclusions travel with the value
   * and are checked at solve time.
   */
  excl: Poly[];
  /**
   * Per-coefficient upper bounds on rounding error, parallel to num:
   * err[i] bounds the error of num[i]. Cancellation of large numbers
   * leaves a leftover proportional to the operands (10000.1 - 10000
   * leaves ~3.6e-13 in that constant), while a typed 0.0000000000005 is
   * exact — no fixed cutoff can tell them apart, so every operation
   * propagates these bounds and the solver trusts each coefficient
   * only beyond its own bound. A single shared bound would let an
   * unrelated huge constant (x + 100000000000000) swamp the error of
   * the exactly-computed x coefficient and erase it.
   */
  err: Poly;
  /**
   * The same per-coefficient error bounds for den. Division moves a
   * value's numerator into a denominator (1/(10000.1 - 10000)), and its
   * error must travel with it — otherwise a later cross-multiplication
   * reintroduces that error into a numerator with no bound attached,
   * and a rounding leftover is mistaken for a genuine term.
   */
  denErr: Poly;
}

/** |p| elementwise. */
function absPoly(p: Poly): Poly {
  return p.map((c) => Math.abs(c));
}

/**
 * Convolution of absolute values: out[k] = Σ |a[i]| · |b[k−i]|.
 * This is how per-coefficient error bounds combine when polynomials
 * are multiplied (the same shape as mulPoly, with magnitudes).
 */
function convAbs(a: Poly, b: Poly): Poly {
  if (a.length === 0 || b.length === 0) return [];
  const out = new Array<number>(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) out[i + j] += Math.abs(a[i]) * Math.abs(b[j]);
  }
  return out;
}

/** Elementwise sum of two bound vectors (missing entries count as 0). */
function addVec(a: Poly, b: Poly): Poly {
  const out = new Array<number>(Math.max(a.length, b.length)).fill(0);
  for (let i = 0; i < a.length; i++) out[i] += a[i];
  for (let i = 0; i < b.length; i++) out[i] += b[i];
  return out;
}

function scaleVec(a: Poly, s: number): Poly {
  return a.map((c) => c * s);
}

/** A Rat's numerator error bounds, padded to num's length with zeros. */
function errVec(r: Rat): Poly {
  const out = new Array<number>(r.num.length).fill(0);
  for (let i = 0; i < Math.min(r.err.length, out.length); i++) out[i] = r.err[i];
  return out;
}

/** A Rat's denominator error bounds, padded to den's length with zeros. */
function denErrVec(r: Rat): Poly {
  const out = new Array<number>(r.den.length).fill(0);
  for (let i = 0; i < Math.min(r.denErr.length, out.length); i++) out[i] = r.denErr[i];
  return out;
}

/**
 * Error bounds for a product of two polynomials whose own bounds are
 * known: each factor's error is amplified by the other factor's
 * magnitudes, plus one rounding allowance for the new products.
 */
function mulErr(aErr: Poly, aVal: Poly, bErr: Poly, bVal: Poly): Poly {
  return addVec(
    addVec(convAbs(aErr, absPoly(bVal)), convAbs(bErr, absPoly(aVal))),
    scaleVec(convAbs(absPoly(aVal), absPoly(bVal)), Number.EPSILON),
  );
}

/** Restrictions a value carries: its recorded exclusions plus its current denominator. */
function domainOf(r: Rat): Poly[] {
  return polyDegree(r.den) >= 1 ? [...r.excl, r.den] : [...r.excl];
}

/** Union of exclusion lists, keeping only polys that can actually be 0 (degree ≥ 1), de-duplicated. */
function mergeExcl(...lists: Poly[][]): Poly[] {
  const seen = new Set<string>();
  const out: Poly[] = [];
  for (const list of lists) {
    for (const p of list) {
      const t = trimPoly(p);
      if (polyDegree(t) < 1) continue;
      const key = t.map((c) => c.toPrecision(12)).join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
    }
  }
  return out;
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

function makeRat(num: Poly, den: Poly = [1], excl: Poly[] = [], err: Poly = [], denErr: Poly = []): Rat {
  let n = trimPoly(num);
  let d = trimPoly(den);
  let e = err;
  let de = denErr;
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
      e = e.map((v) => v / g);
      de = de.map((v) => v / g);
    }
  }
  // Note: the denominator is kept even when the numerator is 0 — the
  // expression is still undefined where its denominator is 0, and the
  // solver needs those excluded values (e.g. 5/(x-2) = 5/(x-2) holds
  // for every x except 2).
  // Keep the denominator's leading coefficient positive, for tidy display.
  if (d[d.length - 1] < 0) {
    return { num: n.map((c) => -c), den: d.map((c) => -c), excl, err: e, denErr: de };
  }
  return { num: n, den: d, excl, err: e, denErr: de };
}

function negRat(a: Rat): Rat {
  return makeRat(
    a.num.map((c) => -c),
    a.den,
    a.excl,
    a.err,
    a.denErr,
  );
}

/**
 * Error bounds for a cross-multiplied sum a.num·b.den ± b.num·a.den.
 * Both products mix numerators with denominators, so numerator and
 * denominator bounds both feed in.
 */
function crossErr(a: Rat, b: Rat): Poly {
  return addVec(mulErr(errVec(a), a.num, denErrVec(b), b.den), mulErr(errVec(b), b.num, denErrVec(a), a.den));
}

/** Error bounds for a combined denominator a.den·b.den. */
function denMulErr(a: Rat, b: Rat): Poly {
  return mulErr(denErrVec(a), a.den, denErrVec(b), b.den);
}

function addRat(a: Rat, b: Rat): Rat {
  return makeRat(
    addPoly(mulPoly(a.num, b.den), mulPoly(b.num, a.den)),
    mulPoly(a.den, b.den),
    mergeExcl(domainOf(a), domainOf(b)),
    crossErr(a, b),
    denMulErr(a, b),
  );
}

function subRat(a: Rat, b: Rat): Rat {
  return makeRat(
    subPoly(mulPoly(a.num, b.den), mulPoly(b.num, a.den)),
    mulPoly(a.den, b.den),
    mergeExcl(domainOf(a), domainOf(b)),
    crossErr(a, b),
    denMulErr(a, b),
  );
}

function mulRat(a: Rat, b: Rat): Rat {
  return makeRat(
    mulPoly(a.num, b.num),
    mulPoly(a.den, b.den),
    mergeExcl(domainOf(a), domainOf(b)),
    mulErr(errVec(a), a.num, errVec(b), b.num),
    denMulErr(a, b),
  );
}

function divRat(a: Rat, b: Rat): Rat {
  if (isZeroPoly(b.num)) throw new Error("Division by zero.");
  // Dividing by b also requires b ≠ 0, so b's numerator joins the exclusions.
  // The new numerator is a.num·b.den and the new denominator is
  // a.den·b.num — each side's bounds follow its own factors, so the
  // divisor's error is carried into the denominator, not dropped.
  return makeRat(
    mulPoly(a.num, b.den),
    mulPoly(a.den, b.num),
    mergeExcl(domainOf(a), domainOf(b), [b.num]),
    mulErr(errVec(a), a.num, denErrVec(b), b.den),
    mulErr(denErrVec(a), a.den, errVec(b), b.num),
  );
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
  // Check the expanded degree from the degrees alone, before expanding:
  // nested powers like ((((x^10)^10)^10)… must fail fast, not hang.
  if (polyDegree(base.num) * Math.abs(e) > MAX_DEGREE || polyDegree(base.den) * Math.abs(e) > MAX_DEGREE) {
    throw new Error(`That power expands beyond degree ${MAX_DEGREE} — too complex for this solver.`);
  }
  // Error bounds for a polynomial power: multiply the value out one
  // factor at a time, propagating the bounds like mulRat does.
  const powErr = (startErr: Poly, startPoly: Poly, count: number): Poly => {
    if (count === 0) return [];
    let curErr = startErr;
    let curAbs = absPoly(startPoly);
    for (let k = 1; k < count; k++) {
      curErr = addVec(
        addVec(convAbs(curErr, absPoly(startPoly)), convAbs(startErr, curAbs)),
        scaleVec(convAbs(curAbs, absPoly(startPoly)), Number.EPSILON),
      );
      curAbs = convAbs(curAbs, absPoly(startPoly));
    }
    return curErr;
  };
  if (e >= 0) {
    return makeRat(
      powPoly(base.num, e),
      powPoly(base.den, e),
      mergeExcl(domainOf(base)),
      powErr(errVec(base), base.num, e),
      powErr(denErrVec(base), base.den, e),
    );
  }
  if (isZeroPoly(base.num)) throw new Error("Division by zero.");
  // A negative power swaps numerator and denominator, so their error
  // bounds swap too: the new numerator is a power of the base's
  // denominator and carries the denominator's bounds.
  return makeRat(
    powPoly(base.den, -e),
    powPoly(base.num, -e),
    mergeExcl(domainOf(base), [base.num]),
    powErr(denErrVec(base), base.den, -e),
    powErr(errVec(base), base.num, -e),
  );
}

function ratToString(r: Rat, variable: string): string {
  const numStr = polyToString(r.num, variable);
  if (isConstantOne(r.den)) return numStr;
  const denStr = polyToString(r.den, variable);
  return polyDegree(r.den) === 0 ? `(${numStr}) / ${denStr}` : `(${numStr}) / (${denStr})`;
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
  // Judge the discriminant relative to the terms that produced it, so an
  // equation whose coefficients are all tiny (or all huge) is classified
  // the same as its scaled-by-a-constant equivalent.
  const discScale = b * b + 4 * Math.abs(a * c);
  const steps = [
    `Here a = ${formatDecimal(a)}, b = ${formatDecimal(b)}, c = ${formatDecimal(c)}`,
    `Discriminant: b² − 4ac = ${formatDecimal(b)}² − 4·${formatDecimal(a)}·${formatDecimal(c)} = ${formatDecimal(discriminant)}`,
  ];

  if (discriminant > DISC_REL_EPS * discScale) {
    const sqrtD = Math.sqrt(discriminant);
    // Numerically stable form: the textbook (−b ± √D) / 2a can cancel the
    // smaller root to exactly 0 when |b| is huge (x² + 1000000000x + 1).
    // Compute the larger root via q, then the other from the product c/a.
    const q = -0.5 * (b + (b >= 0 ? sqrtD : -sqrtD));
    const roots = [q / a, c / q].sort((m, n) => n - m);
    const s1 = formatAnswer(roots[0]);
    const s2 = formatAnswer(roots[1]);
    steps.push(`Quadratic formula: ${variable} = (−b ± √${formatDecimal(discriminant)}) / 2a = ${s1} or ${s2}`);
    return {
      kind: "two",
      solutions: [s1, s2],
      numericSolutions: roots,
      steps,
    };
  }

  if (Math.abs(discriminant) <= DISC_REL_EPS * discScale) {
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
  const rawDiff = subRat(lhs, rhs);

  // Decide which numerator coefficients can be trusted. Every operation
  // tracked its rounding-error bound (Rat.err): a coefficient at or
  // below that bound may be pure cancellation leftover — (10000.1-10000)*x
  // = 0.1*x leaves ~3.6e-13 of x — and must not be promoted into a real
  // term, while a typed 0.0000000000005 carries no error and stays.
  // Each coefficient is judged against its OWN tracked error bound:
  // a huge constant elsewhere in the equation must not erase an
  // exactly-computed x coefficient (x + 100000000000000 = 0).
  const trustBound = (i: number) => 64 * (rawDiff.err[i] ?? 0);
  let num = trimPoly(rawDiff.num);
  let topDeg = num.length - 1;
  while (topDeg > 0 && Math.abs(num[topDeg]) <= Math.max(trustBound(topDeg), 1e-280)) topDeg--;
  num = num.slice(0, topDeg + 1);
  if (topDeg === 0 && Math.abs(num[0]) <= trustBound(0)) num = [0];

  // Scale the numerator to a leading coefficient of 1 (when a trusted
  // one exists). Zero tests and the discriminant then judge the equation
  // by its shape, not by how tiny or huge the typed coefficients are:
  // 0.0000000000005x = 1 must solve exactly like x = 2000000000000.
  let err = rawDiff.err;
  if (topDeg >= 1 && Math.abs(num[topDeg] - 1) >= 1e-12) {
    const leadCoeff = num[topDeg];
    num = trimPoly(num.map((c) => c / leadCoeff));
    err = rawDiff.err.map((v) => v / Math.abs(leadCoeff));
  }
  const diff: Rat = { num, den: rawDiff.den, excl: rawDiff.excl, err, denErr: rawDiff.denErr };

  const hasDenominator = !isConstantOne(diff.den);
  const standardForm = `${ratToString(diff, variable)} = 0`;

  // Values that make any denominator in the original equation 0 are never
  // allowed — including denominators that cancelled away while simplifying
  // (x/(1/x) simplifies to x², but x = 0 is still not a valid answer),
  // which diff.excl remembers.
  // diff.excl already covers every denominator root: each operation
  // records its operands' denominators, and the final combined
  // denominator's roots are a subset of those. (Enumerating the combined
  // denominator itself would fail: it can be degree 4+ even when every
  // original denominator is linear.) The fallback is defensive only.
  const excludedPolys = diff.excl.length > 0 ? diff.excl : hasDenominator ? [diff.den] : [];
  let excludedRoots: number[] | null = [];
  for (const p of excludedPolys) {
    const roots = realRootsOf(p);
    if (roots === null) {
      excludedRoots = null;
      break;
    }
    excludedRoots.push(...roots);
  }
  if (excludedRoots) {
    excludedRoots.sort((a, b) => a - b);
    excludedRoots = excludedRoots.filter(
      (r, i) => i === 0 || Math.abs(r - (excludedRoots as number[])[i - 1]) > 1e-9 * Math.max(1, Math.abs(r)),
    );
  }
  const excludedList =
    excludedRoots && excludedRoots.length > 0 ? excludedRoots.map((r) => formatFractionOrDecimal(r)).join(", ") : null;
  const exclusionsUnknown = excludedRoots === null;

  const leadSteps: string[] = [];
  if (!hasDenominator) {
    leadSteps.push(`Combine both sides into one equation: ${standardForm}`);
  } else {
    leadSteps.push(`Combine into a single fraction: ${standardForm}`);
    if (excludedList) {
      leadSteps.push(`A denominator can't be 0, so ${variable} ≠ ${excludedList}.`);
    } else if (exclusionsUnknown) {
      leadSteps.push(`A denominator can't be 0, so any answer that makes one 0 will be rejected.`);
    }
    leadSteps.push(`A fraction is 0 exactly when its top is 0, so solve: ${polyToString(diff.num, variable)} = 0`);
  }

  const core = solvePolynomialCore(diff.num, variable);
  const steps = [...leadSteps, ...core.steps];

  // Reject candidate roots that make any original denominator 0 (extraneous roots).
  let kind = core.kind;
  let solutions = core.solutions;
  if (excludedPolys.length > 0 && (kind === "unique" || kind === "two" || kind === "double")) {
    const kept: string[] = [];
    core.numericSolutions.forEach((value, i) => {
      if (excludedPolys.some((p) => isZeroAt(p, value))) {
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
      if (excludedList) {
        answerText = `${variable} can be any real number except ${excludedList}`;
        solutions = [`any real number except ${excludedList}`];
      } else if (exclusionsUnknown) {
        answerText = `${variable} can be any real number except values that make a denominator 0`;
        solutions = [`any real number except values that make a denominator 0`];
      } else {
        answerText = `${variable} can be any real number`;
      }
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
