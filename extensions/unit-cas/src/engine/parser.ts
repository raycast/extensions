import { Node, RelOp } from "./ast";
import { canonicalFunc } from "./builtins";
import { fl, neg as numNeg, parseDecimal } from "./num";
import { lookupNspire, lookupTex } from "./units";

export class ParseError extends Error {}

type Tok =
  | { t: "num"; s: string }
  | { t: "id"; s: string; fn?: boolean }
  | { t: "unit"; s: string }
  | { t: "op"; s: string }
  | { t: "kw"; s: "and" | "or" | "xor" | "not" }
  | { t: "cmd"; s: string }
  | { t: "raw"; cmd: string; args: string[] }
  | { t: "eof" };

export interface ParseOptions {
  /** Treat decimal literals as exact rationals (Exact mode). */
  exactDecimals?: boolean;
  /** Names of user-defined functions, so `f(x)` parses as a call. */
  userFuncs?: Set<string>;
}

export interface Parsed {
  node: Node;
  latex: boolean;
}

const GREEK: Record<string, string> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  varepsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  vartheta: "θ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  rho: "ρ",
  varrho: "ρ",
  sigma: "σ",
  tau: "τ",
  upsilon: "υ",
  phi: "φ",
  varphi: "φ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
  Gamma: "Γ",
  Delta: "Δ",
  Theta: "Θ",
  Lambda: "Λ",
  Xi: "Ξ",
  Pi: "Π",
  Sigma: "Σ",
  Upsilon: "Υ",
  Phi: "Φ",
  Psi: "Ψ",
  ell: "ℓ",
  hbar: "ħ",
};

const LATEX_FUNCS = new Set([
  "sin",
  "cos",
  "tan",
  "sec",
  "csc",
  "cot",
  "arcsin",
  "arccos",
  "arctan",
  "sinh",
  "cosh",
  "tanh",
  "coth",
  "ln",
  "log",
  "lg",
  "exp",
  "max",
  "min",
  "gcd",
]);

const SKIP_CMDS = new Set([
  ",",
  ";",
  ":",
  "!",
  " ",
  ">",
  "quad",
  "qquad",
  "enspace",
  "thinspace",
  "medspace",
  "thickspace",
  "displaystyle",
  "textstyle",
  "big",
  "Big",
  "bigg",
  "Bigg",
  "bigl",
  "bigr",
  "Bigl",
  "Bigr",
  "biggl",
  "biggr",
  "Biggl",
  "Biggr",
  "limits",
  "nolimits",
  "boxed",
  "middle",
]);

const RAW_CMDS = new Set([
  "mathrm",
  "text",
  "textrm",
  "textnormal",
  "rm",
  "operatorname",
  "mathit",
  "textit",
  "mathbf",
  "textbf",
  "mathsf",
  "si",
  "unit",
  "SI",
  "qty",
  "num",
  "ang",
  "mathring",
]);

const CMD_OPS: Record<string, string> = {
  cdot: "*",
  times: "*",
  ast: "*",
  cdotp: "*",
  div: "/",
  le: "<=",
  leq: "<=",
  leqslant: "<=",
  ge: ">=",
  geq: ">=",
  geqslant: ">=",
  ne: "≠",
  neq: "≠",
  lt: "<",
  gt: ">",
  mid: "|",
  vert: "|A",
  lvert: "|L",
  rvert: "|R",
  "|": "|A",
  to: "→",
  rightarrow: "→",
  longrightarrow: "→",
  blacktriangleright: "►",
  triangleright: "►",
  rhd: "►",
  pi: "π",
  infty: "∞",
  "{": "{",
  "}": "}",
  lbrace: "{",
  rbrace: "}",
  "%": "%",
  "\\": ",",
  cr: ",",
  newline: ",",
  circ: "°",
  degree: "°",
  textdegree: "°",
  coloneqq: ":=",
};

const CMD_KW: Record<string, "and" | "or" | "not"> = {
  land: "and",
  wedge: "and",
  lor: "or",
  vee: "or",
  lnot: "not",
  neg: "not",
};

const CMD_UNITS: Record<string, string> = {
  Omega: "Ω",
  ohm: "Ω",
  AA: "Å",
  angstrom: "Å",
  celsius: "°C",
  degreeCelsius: "°C",
};

const SUPERSCRIPT: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "⁻": "-",
  "⁺": "+",
};

const FUNC_WORDS = [
  "system",
  "dotP",
  "crossP",
  "norm",
  "unitV",
  "median",
  "stDevSamp",
  "stDevPop",
  "varSamp",
  "varPop",
  "product",
  "cumSum",
  "dim",
  "SortA",
  "SortD",
  "augment",
  "seq",
  "when",
  "isPrime",
  "intDiv",
  "getNum",
  "getDenom",
  "factor",
  "expand",
  "nDeriv",
  "nInt",
  "fMin",
  "fMax",
  "solve",
  "nsolve",
  "nSolve",
  "csolve",
  "cSolve",
  "zeros",
  "arcsin",
  "arccos",
  "arctan",
  "sinh",
  "cosh",
  "tanh",
  "sin",
  "cos",
  "tan",
  "sec",
  "csc",
  "cot",
  "asin",
  "acos",
  "atan",
  "sqrt",
  "root",
  "abs",
  "floor",
  "ceiling",
  "ceil",
  "round",
  "iPart",
  "fPart",
  "mod",
  "gcd",
  "lcm",
  "min",
  "max",
  "nCr",
  "nPr",
  "ln",
  "log",
  "exp",
  "sign",
  "approx",
  "exact",
  "tmpCnv",
  "sum",
  "mean",
].sort((a, b) => b.length - a.length);

/** Strips math delimiters and normalizes look-alike characters. */
export function normalizeInput(s: string): string {
  s = s.trim();
  s = s.replace(/^\$\$([\s\S]*)\$\$$/, "$1").replace(/^\$([\s\S]*)\$$/, "$1");
  s = s.replace(/^\\\[([\s\S]*)\\\]$/, "$1").replace(/^\\\(([\s\S]*)\\\)$/, "$1");
  s = s.replace(/\\begin\{(equation|displaymath|math)\*?\}([\s\S]*)\\end\{\1\*?\}/, "$2");
  s = s.replace(/\\label\{[^}]*\}|\\nonumber|\\notag/g, "");
  s = s
    .replace(/µ/g, "μ")
    .replace(/Ω/g, "Ω")
    .replace(/[−–]/g, "-")
    .replace(/[×⋅∙∗·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[▶►▸]/g, "►")
    .replace(/@>/g, "►")
    .replace(/ᴇ/g, "E")
    // TI-Nspire copies the ⁻¹ superscript (sin⁻¹, x⁻¹) as the private-use character U+F005.
    .replace(/\uF005/g, "⁻¹")
    .replace(/ℯ/g, "ℯ")
    .replace(/\u00a0/g, " ");
  // Trailing punctuation from prose ("x=2.") would be a float marker, so only drop commas/semicolons.
  s = s.replace(/(?<!\\)[,;]\s*$/, "");
  return s.trim();
}

export function looksLikeLatex(s: string): boolean {
  // Bare |x| bars only make sense as absolute value when they cannot be the Nspire "with" operator.
  return /\\[a-zA-Z{},;:!%| ]|~|[\^_]\{|\{,\}/.test(s) || /(^|[(+\-*/=,])\s*\|/.test(s);
}

function latexPreprocess(s: string): string {
  return (
    s
      .replace(/\\(dfrac|tfrac|cfrac|frac|binom)\s*([^{\\\s])\s*([^{\\\s])/g, "\\$1{$2}{$3}")
      .replace(/\\(dfrac|tfrac|cfrac|frac|binom)\s*(\{[^{}]*\})\s*([^{\\\s])/g, "\\$1$2{$3}")
      .replace(/\\sqrt\s*([0-9a-zA-Z])/g, "\\sqrt{$1}")
      .replace(/\^\s*([0-9])(?=[0-9])/g, "^{$1}")
      .replace(/(\d)\{,\}(\d)/g, "$1.$2")
      // Scientific notation: 1.5\cdot 10^{-7} is a float literal, like 1.5ᴇ-7 on the Nspire.
      .replace(/(\d+(?:\.\d*)?)\s*\\(?:cdot|times)\s*10\s*\^\s*\{?\s*([+-]?\d+)\s*\}?/g, "$1E$2")
      .replace(/(\d)\\,(\d{3})(?!\d)/g, "$1$2")
      .replace(/\{\s*\}/g, "")
      .replace(/\\left\s*\.|\\right\s*\./g, "")
      .replace(/\\(left|right)\s*(\\[{}|]|\\[lr]?vert|[()[\]|])/g, (_m, side, d) => {
        if (d === "|" || d === "\\|" || d === "\\vert") return side === "left" ? "\\lvert " : "\\rvert ";
        return d;
      })
      .replace(/\\(left|right)\b/g, "")
  );
}

function readBraced(s: string, i: number): [string, number] {
  // s[i] === "{"
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "\\") {
      j++;
      continue;
    }
    if (s[j] === "{") depth++;
    else if (s[j] === "}") {
      depth--;
      if (depth === 0) return [s.slice(i + 1, j), j + 1];
    }
  }
  throw new ParseError("Unbalanced braces");
}

function skipSpaces(s: string, i: number): number {
  while (i < s.length && /\s/.test(s[i])) i++;
  return i;
}

function readArg(s: string, i: number): [string, number] {
  i = skipSpaces(s, i);
  if (s[i] === "{") return readBraced(s, i);
  if (s[i] === "\\") {
    const m = /^\\([a-zA-Z]+|.)/.exec(s.slice(i));
    if (m) return [m[0], i + m[0].length];
  }
  return [s[i] ?? "", i + 1];
}

function normalizeSub(s: string): string {
  return s
    .replace(/\\(mathrm|text|textrm|mathit|rm)\s*/g, "")
    .replace(/\\([a-zA-Z]+)/g, (_m, g) => GREEK[g] ?? g)
    .replace(/[{}\s]/g, "");
}

const isLetter = (c: string) => /\p{L}/u.test(c) && c !== "π" && c !== "ℯ";
const isIdChar = (c: string) => isLetter(c) || /[0-9_]/.test(c);

function lex(src: string, latex: boolean): Tok[] {
  const s = latex ? latexPreprocess(src) : src;
  const out: Tok[] = [];
  let i = 0;
  const push = (...t: Tok[]) => out.push(...t);
  const envs: string[] = [];
  const MATRIX_ENVS = new Set(["pmatrix", "bmatrix", "vmatrix", "Bmatrix", "matrix", "smallmatrix"]);

  while (i < s.length) {
    const c = s[i];
    // "3\ km\blacktriangleright mi": a bare unit after ► is the conversion target.
    const prev = out[out.length - 1];
    if (latex && prev?.t === "op" && prev.s === "►") {
      const g = readUnitGroup(s, i);
      if (g) {
        push({ t: "raw", cmd: "mathrm", args: [g[0]] });
        i = g[1];
        continue;
      }
    }
    if (latex && c === "&" && MATRIX_ENVS.has(envs[envs.length - 1])) {
      push({ t: "op", s: "," });
      i++;
      continue;
    }
    if (/\s/.test(c) || (latex && (c === "~" || c === "&"))) {
      // "300~Hz": an explicit LaTeX space after a number puts bare unit letters in unit position.
      if (latex && c === "~" && unitPositionBefore(out)) {
        const g = readUnitGroup(s, i + 1);
        if (g) {
          push({ t: "raw", cmd: "mathrm", args: [g[0]] });
          i = g[1];
          i = readUnitDenominator(s, i, out);
          continue;
        }
      }
      // Bare words "and"/"or" in LaTeX text are only recognized when separated by spaces.
      i++;
      continue;
    }

    // Numbers
    const nm = /^(\d+\.?\d*|\.\d+)(?:([Ee])([+-]?\d+))?/.exec(s.slice(i));
    if (nm) {
      let text = nm[1];
      let len = nm[1].length;
      if (nm[2] && (nm[2] === "E" || !latex)) {
        text += "E" + nm[3];
        len = nm[0].length;
      }
      push({ t: "num", s: text });
      i += len;
      // "500km/h": a multi-letter unit glued to a number is a unit too. Single letters ("2x", "3m")
      // stay variables, as do words that are not units ("2xy", "2sin(x)").
      if (latex && /^[a-zA-Z]{2}/.test(s.slice(i))) {
        const g = readUnitGroup(s, i);
        if (g) {
          push({ t: "raw", cmd: "mathrm", args: [g[0]] });
          i = readUnitDenominator(s, g[1], out);
        }
      }
      continue;
    }

    // Nspire unit: _name (not glued to a preceding identifier)
    if (c === "_" && !(latex && /[{0-9]/.test(s[i + 1] ?? ""))) {
      const m = /^_([\p{L}\p{N}°]+|'|")/u.exec(s.slice(i));
      if (!m) throw new ParseError("Expected a unit name after _");
      push({ t: "unit", s: m[1] });
      i += m[0].length;
      continue;
    }
    if (c === "_") {
      push({ t: "op", s: "_" });
      i++;
      continue;
    }

    // LaTeX commands
    if (c === "\\") {
      const m = /^\\([a-zA-Z]+|.)/.exec(s.slice(i));
      if (!m) throw new ParseError("Dangling backslash");
      const name = m[1];
      i += m[0].length;
      if (SKIP_CMDS.has(name)) {
        // "300\ \frac{m}{s}", "500\ Hz": bare unit letters after a number and an explicit space.
        if (UNIT_SPACERS.has(name) && unitPositionBefore(out)) {
          const g = readUnitGroup(s, i);
          if (g) {
            push({ t: "raw", cmd: "mathrm", args: [g[0]] });
            i = g[1];
            i = readUnitDenominator(s, i, out);
          }
        }
        continue;
      }
      if (name === "begin" || name === "end") {
        const [env, j] = readArg(s, i);
        i = j;
        if (name === "begin" && env === "array") i = readArg(s, i)[1];
        if (name === "begin") envs.push(env);
        else envs.pop();
        if (env === "cases") {
          if (name === "begin") push({ t: "id", s: "system", fn: true }, { t: "op", s: "(" });
          else push({ t: "op", s: ")" });
          continue;
        }
        if (MATRIX_ENVS.has(env)) {
          push({ t: "op", s: name === "begin" ? "[" : "]" });
          continue;
        }
        if (
          env === "cases" ||
          env === "aligned" ||
          env === "align" ||
          env === "align*" ||
          env === "array" ||
          env === "gathered"
        ) {
          push({ t: "op", s: name === "begin" ? "{" : "}" });
        }
        continue;
      }
      if (name in CMD_OPS) {
        push({ t: "op", s: CMD_OPS[name] });
        continue;
      }
      if (name in CMD_KW) {
        push({ t: "kw", s: CMD_KW[name] });
        continue;
      }
      if (name in CMD_UNITS) {
        push({ t: "unit", s: CMD_UNITS[name] });
        continue;
      }
      if (name === "mu") {
        // \mu\mathrm{m} -> micrometer
        const j = skipSpaces(s, i);
        const mm = /^\\(mathrm|text|textrm|rm)\b/.exec(s.slice(j));
        if (mm) {
          const [content, k] = readArg(s, j + mm[0].length);
          if (lookupTex("μ" + content)) {
            push({ t: "raw", cmd: "mathrm", args: ["μ" + content] });
            i = k;
            continue;
          }
        }
      }
      if (name in GREEK) {
        let id = GREEK[name];
        if (name === "Delta") {
          const j = skipSpaces(s, i);
          if (/[a-zA-Z]/.test(s[j] ?? "")) {
            id += s[j];
            i = j + 1;
          } else if (s[j] === "\\") {
            const g = /^\\([a-zA-Z]+)/.exec(s.slice(j));
            if (g && GREEK[g[1]]) {
              id += GREEK[g[1]];
              i = j + g[0].length;
            }
          }
        }
        [id, i] = readSubscript(s, i, id);
        push({ t: "id", s: id });
        continue;
      }
      if (RAW_CMDS.has(name)) {
        const args: string[] = [];
        let j = skipSpaces(s, i);
        if ((name === "SI" || name === "qty" || name === "si" || name === "unit" || name === "num") && s[j] === "[") {
          j = s.indexOf("]", j) + 1;
        }
        const count = name === "SI" || name === "qty" ? 2 : 1;
        for (let k = 0; k < count; k++) {
          const [a, nj] = readArg(s, j);
          args.push(a);
          j = nj;
        }
        i = j;
        const text = args[0].replace(/\\[,;: ]|~/g, " ").trim();
        if (count === 1 && /^(and|or|xor|not)$/.test(text) && name !== "operatorname") {
          push({ t: "kw", s: text as "and" | "or" | "xor" | "not" });
          continue;
        }
        if (count === 1 && (text === "with" || text === "where")) {
          push({ t: "op", s: "|" });
          continue;
        }
        push({ t: "raw", cmd: name, args });
        continue;
      }
      if (
        LATEX_FUNCS.has(name) ||
        name === "frac" ||
        name === "dfrac" ||
        name === "tfrac" ||
        name === "cfrac" ||
        name === "sqrt" ||
        name === "binom" ||
        name === "int" ||
        name === "sum" ||
        name === "prod"
      ) {
        push({ t: "cmd", s: name.endsWith("frac") ? "frac" : name });
        continue;
      }
      if (name === "mu") {
        push({ t: "id", s: "μ" });
        continue;
      }
      throw new ParseError(`Unsupported LaTeX command \\${name}`);
    }

    // Identifiers
    if (isLetter(c)) {
      if (latex) {
        const run = /^[a-zA-Z]+/.exec(s.slice(i))?.[0];
        if (run) {
          const before = s[i - 1] ?? " ";
          const after = s[i + run.length] ?? " ";
          if (/^(and|or|xor|not)$/.test(run) && /[\s}]/.test(before) && /[\s{\\]/.test(after)) {
            push({ t: "kw", s: run as "and" | "or" | "xor" | "not" });
            i += run.length;
            continue;
          }
          const word = FUNC_WORDS.find(
            (w) => run.startsWith(w) && w.length >= 2 && /^\s*(\(|\\left|\\lparen)/.test(s.slice(i + w.length)),
          );
          if (word) {
            push({ t: "id", s: word, fn: true });
            i += word.length;
            continue;
          }
        }
        let id = c;
        i++;
        [id, i] = readSubscript(s, i, id);
        push({ t: "id", s: id });
        continue;
      }
      let j = i;
      while (j < s.length && isIdChar(s[j])) j++;
      let id = s.slice(i, j);
      i = j;
      if (/^(and|or|xor|not)$/i.test(id)) {
        push({ t: "kw", s: id.toLowerCase() as "and" | "or" | "xor" | "not" });
        continue;
      }
      if (s.startsWith("⁻¹", i) && canonicalFunc(id + "⁻¹")) {
        id = id + "⁻¹";
        i += 2;
      }
      push({ t: "id", s: id });
      continue;
    }

    // Superscript runs (x², 10⁻³)
    if (c in SUPERSCRIPT) {
      let j = i;
      let txt = "";
      while (j < s.length && s[j] in SUPERSCRIPT) txt += SUPERSCRIPT[s[j++]];
      if (txt === "-" || txt === "+") {
        // Lone superscript minus is the Nspire negation sign.
        push({ t: "op", s: txt });
      } else {
        push({ t: "op", s: "^" });
        push({ t: "op", s: "(" });
        out.push(...lex(txt, false).slice(0, -1));
        push({ t: "op", s: ")" });
      }
      i = j;
      continue;
    }

    // Operators
    const two = s.slice(i, i + 2);
    if ([":=", "<=", ">=", "/=", "=:", "->", "!="].includes(two)) {
      const map: Record<string, string> = { "/=": "≠", "!=": "≠", "=:": "→", "->": "→" };
      push({ t: "op", s: map[two] ?? two });
      i += 2;
      continue;
    }
    if (c === "≤") {
      push({ t: "op", s: "<=" });
      i++;
      continue;
    }
    if (c === "≥") {
      push({ t: "op", s: ">=" });
      i++;
      continue;
    }
    if (c === "|") {
      push({ t: "op", s: latex ? "|A" : "|" });
      i++;
      continue;
    }
    if (c === "'" || c === "′") {
      throw new ParseError("Derivative notation (') is not supported");
    }
    if ("+-*/^()[]{},=<>!%°≠→►√π∞ℯ∫".includes(c)) {
      push({ t: "op", s: c });
      i++;
      continue;
    }
    const code = "U+" + c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0");
    if (/\p{Co}/u.test(c)) throw new ParseError(`Unsupported TI-Nspire symbol (${code})`);
    throw new ParseError(`Unexpected character "${c}" (${code})`);
  }
  push({ t: "eof" });
  return out;
}

const UNIT_SPACERS = new Set([" ", ",", ";", ":"]);

/** A unit group may follow a number, or a closing bracket of a numeric expression ("(1+2)\ kg"). */
function unitPositionBefore(out: Tok[]): boolean {
  const last = out[out.length - 1];
  return !!last && (last.t === "num" || (last.t === "op" && (last.s === ")" || last.s === "}")));
}

/**
 * "\frac{3\ m}{s}", "\frac{4186\ J}{kg\cdot K}": when a unit group ends the numerator of a \frac,
 * a denominator made only of unit names is read as units too. Pushes the closing/opening braces and
 * the denominator and returns the new index (unchanged when the pattern does not apply).
 */
function readUnitDenominator(s: string, i: number, out: Tok[]): number {
  const close = skipUnitSpace(s, i);
  if (s[close] !== "}") return i;
  const open = skipSpaces(s, close + 1);
  if (s[open] !== "{") return i;
  // The unmatched "{" before the unit group must open the numerator of a \frac.
  let depth = 0;
  let k = out.length - 1;
  for (; k >= 0; k--) {
    const t = out[k];
    if (t.t !== "op") continue;
    if (t.s === "}") depth++;
    else if (t.s === "{" && depth-- === 0) break;
  }
  const cmd = out[k - 1];
  if (k < 1 || cmd.t !== "cmd" || cmd.s !== "frac") return i;
  const [den, end] = readBraced(s, open);
  const r = readUnitSeq(den, skipUnitSpace(den, 0), false);
  if (!r || skipUnitSpace(den, r[1]) !== den.length || !parseUnitTex(r[0], false)) return i;
  out.push({ t: "op", s: "}" }, { t: "op", s: "{" }, { t: "raw", cmd: "mathrm", args: [r[0]] }, { t: "op", s: "}" });
  return end;
}

/** Skips whitespace and explicit LaTeX spaces (\ , \, \; \: ~). */
function skipUnitSpace(s: string, i: number): number {
  for (;;) {
    if (/\s|~/.test(s[i] ?? "")) i++;
    else if (s[i] === "\\" && /[ ,;:]/.test(s[i + 1] ?? "")) i += 2;
    else return i;
  }
}

/**
 * Reads bare-letter units in unit position, as written by math editors: "Hz", "N\cdot m", "m^{2}",
 * "\mu m", "\Omega", "\frac{m}{s^{2}}", "\frac{J}{kg\cdot K}". Every name must be a known unit
 * (whole letter runs, so "Hz" is hertz and "ab" is not a unit); otherwise returns null and the
 * letters stay variables. Returns unit text for parseUnitTex and the end index.
 */
function readUnitGroup(s: string, start: number): [string, number] | null {
  const i0 = skipUnitSpace(s, start);
  const frac = /^\\[dtc]?frac\s*(?=\{)/.exec(s.slice(i0));
  if (frac) {
    const [num, j] = readBraced(s, i0 + frac[0].length);
    const k = skipSpaces(s, j);
    if (s[k] !== "{") return null;
    const [den, end] = readBraced(s, k);
    const a = readUnitSeq(num, 0, false);
    const b = readUnitSeq(den, 0, false);
    if (!a || !b || skipUnitSpace(num, a[1]) !== num.length || skipUnitSpace(den, b[1]) !== den.length) return null;
    const text = `(${a[0]})/(${b[0]})`;
    return parseUnitTex(text, false) ? [text, end] : null;
  }
  const r = readUnitSeq(s, i0, /\\int\b/.test(s));
  return r && parseUnitTex(r[0], false) ? r : null;
}

/** Reads unit atoms joined by spaces, \cdot or /. Null when an atom-like word is not a unit. */
function readUnitSeq(s: string, i: number, inIntegral: boolean): [string, number] | null {
  let text = "";
  let end = -1;
  let sep = "";
  for (;;) {
    const a = readUnitAtom(s, i, inIntegral);
    if (a === null) return null;
    if (a === undefined) break;
    text += (end < 0 ? "" : sep === "/" ? "/" : " ") + a[0];
    end = i = a[1];
    // Separator before the next atom; only consumed when an atom follows.
    let j = skipUnitSpace(s, i);
    sep = " ";
    const op = /^(\\cdot\b|\\times\b|\/)/.exec(s.slice(j));
    if (op) {
      sep = op[0] === "/" ? "/" : " ";
      j = skipUnitSpace(s, j + op[0].length);
    } else if (j === i) break; // atoms must be separated
    i = j;
  }
  return end < 0 ? null : [text, end];
}

/** One unit name with an optional numeric exponent. undefined: not atom-like; null: unknown unit. */
function readUnitAtom(s: string, i: number, inIntegral: boolean): [string, number] | null | undefined {
  const rest = s.slice(i);
  let name: string;
  let m: RegExpExecArray | null;
  if ((m = /^[a-zA-Z]*\\(Omega|ohm)\b/.exec(rest))) name = m[0].replace(/\\(Omega|ohm)$/, "Ω");
  else if ((m = /^[a-zA-Z]+/.exec(rest))) {
    // \int ... 2\ dx: the differential is not a unit.
    if (inIntegral && /^d[a-zA-Z]$/.test(m[0])) return undefined;
    name = m[0];
  } else if ((m = /^\\mathring\s*\{\s*A\s*\}/.exec(rest))) name = "Å";
  else if ((m = /^\\mu\s*([a-zA-Z]+)/.exec(rest))) name = "μ" + m[1];
  else if ((m = /^\\(mathrm|text|textrm|rm)\s*(?=\{)/.exec(rest))) {
    const [content, j] = readBraced(s, i + m[0].length);
    m = [s.slice(i, j)] as unknown as RegExpExecArray;
    name = content;
  } else return undefined;
  let j = i + m[0].length;
  // Subscripts (m_e) or function calls (s(3)) mean this is not a bare unit.
  if (/[_(]/.test(s[j] ?? "")) return null;
  if (!lookupTex(name)) return null;
  const e = /^\s*\^\s*(\{\s*[+-]?\d+\s*\}|[0-9])/.exec(s.slice(j));
  if (e) {
    name += "^" + e[1];
    j += e[0].length;
  }
  return [name, j];
}

function readSubscript(s: string, i: number, id: string): [string, number] {
  if (s[i] !== "_") return [id, i];
  const n = s[i + 1];
  if (n === "{") {
    const [content, j] = readBraced(s, i + 1);
    return [id + "_" + normalizeSub(content), j];
  }
  if (n === "\\") {
    const m = /^\\([a-zA-Z]+)/.exec(s.slice(i + 1));
    if (m) return [id + "_" + normalizeSub(m[0]), i + 1 + m[0].length];
  }
  if (n && /[a-zA-Z0-9]/.test(n)) return [id + "_" + n, i + 2];
  return [id, i];
}

const REL_OPS: Record<string, RelOp> = { "=": "=", "≠": "≠", "<": "<", ">": ">", "<=": "≤", ">=": "≥" };

class Parser {
  private i = 0;
  private absDepth = 0;
  private integralDepth = 0;
  constructor(
    private toks: Tok[],
    private latex: boolean,
    private opts: ParseOptions,
  ) {}

  private get tok(): Tok {
    return this.toks[this.i];
  }
  private peek(k = 1): Tok {
    return this.toks[Math.min(this.i + k, this.toks.length - 1)];
  }
  private isOp(s: string, t: Tok = this.tok): boolean {
    return t.t === "op" && t.s === s;
  }
  private eat(s: string): boolean {
    if (this.isOp(s)) {
      this.i++;
      return true;
    }
    return false;
  }
  private expect(s: string) {
    if (!this.eat(s)) throw new ParseError(`Expected "${s}"`);
  }

  parseTop(): Node {
    if (this.tok.t === "eof") throw new ParseError("Empty input");
    const n = this.parseStatement();
    const rest = this.toks[this.i];
    if (rest.t !== "eof") throw new ParseError(`Unexpected ${describe(rest)}`);
    return n;
  }

  private parseStatement(): Node {
    // f(x):=body
    if (this.tok.t === "id" && this.isOp("(", this.peek())) {
      const save = this.i;
      const name = this.tok.s;
      this.i += 2;
      const params: string[] = [];
      let ok = true;
      while (!this.isOp(")")) {
        if (this.tok.t !== "id") {
          ok = false;
          break;
        }
        params.push(this.tok.s);
        this.i++;
        if (!this.eat(",")) break;
      }
      if (ok && this.eat(")") && this.eat(":=")) {
        return { type: "assign", name, params, body: this.parseWith() };
      }
      this.i = save;
    }
    const e = this.parseWith();
    if (this.eat(":=")) {
      if (e.type !== "var") throw new ParseError("Can only assign to a variable name");
      return { type: "assign", name: e.name, body: this.parseWith() };
    }
    if (this.eat("→")) {
      if (this.tok.t !== "id") throw new ParseError("Expected a variable name after →");
      const name = this.tok.s;
      this.i++;
      return { type: "assign", name, body: e };
    }
    return e;
  }

  private parseWith(): Node {
    let l = this.parseConvert();
    while (this.eat("|")) l = { type: "with", l, r: this.parseConvert() };
    return l;
  }

  private parseConvert(): Node {
    let l = this.parseOr();
    while (this.eat("►")) l = { type: "convert", l, r: this.parseOr() };
    return l;
  }

  private parseOr(): Node {
    let l = this.parseAnd();
    while (this.tok.t === "kw" && (this.tok.s === "or" || this.tok.s === "xor")) {
      this.i++;
      l = { type: "or", l, r: this.parseAnd() };
    }
    return l;
  }

  private parseAnd(): Node {
    let l = this.parseNot();
    while (this.tok.t === "kw" && this.tok.s === "and") {
      this.i++;
      l = { type: "and", l, r: this.parseNot() };
    }
    return l;
  }

  private parseNot(): Node {
    if (this.tok.t === "kw" && this.tok.s === "not") {
      this.i++;
      return { type: "not", arg: this.parseNot() };
    }
    return this.parseRel();
  }

  private relOp(): RelOp | undefined {
    return this.tok.t === "op" ? REL_OPS[this.tok.s] : undefined;
  }

  private parseRel(): Node {
    const first = this.parseAdd();
    let op = this.relOp();
    if (!op) return first;
    let node: Node | undefined;
    let left = first;
    while (op) {
      this.i++;
      const right = this.parseAdd();
      const rel: Node = { type: "rel", op, l: left, r: right };
      node = node ? { type: "and", l: node, r: rel } : rel;
      left = right;
      op = this.relOp();
    }
    return node!;
  }

  private parseAdd(): Node {
    let l = this.parseMul();
    for (;;) {
      if (this.eat("+")) l = { type: "add", l, r: this.parseMul() };
      else if (this.eat("-")) l = { type: "sub", l, r: this.parseMul() };
      else return l;
    }
  }

  private isDifferential(k = 0): boolean {
    const t = this.peek(k),
      n = this.peek(k + 1);
    const isD =
      (t.t === "id" && t.s === "d") || (t.t === "raw" && t.args[0].trim() === "d" && t.cmd !== "operatorname");
    return isD && n.t === "id";
  }

  private startsPrimary(t: Tok = this.tok): boolean {
    if (this.integralDepth > 0 && t === this.tok && this.isDifferential()) return false;
    switch (t.t) {
      case "num":
      case "id":
      case "unit":
      case "cmd":
        return true;
      case "raw":
        return true;
      case "op":
        return ["(", "{", "[", "√", "π", "∞", "ℯ", "|L"].includes(t.s) || (t.s === "|A" && this.absDepth === 0);
      default:
        return false;
    }
  }

  private parseMul(): Node {
    let l = this.parseUnary();
    for (;;) {
      if (this.eat("*")) l = { type: "mul", l, r: this.parseUnary() };
      else if (this.eat("/")) l = { type: "div", l, r: this.parseUnary() };
      else if (this.startsPrimary()) l = { type: "mul", l, r: this.parsePow(), implicit: true };
      else return l;
    }
  }

  private parseUnary(): Node {
    if (this.eat("-")) {
      const a = this.parseUnary();
      return a.type === "num" ? { type: "num", value: numNeg(a.value) } : { type: "neg", arg: a };
    }
    if (this.eat("+")) return this.parseUnary();
    return this.parsePow();
  }

  private parsePow(): Node {
    let base = this.parsePostfix(this.parsePrimary());
    if (this.isOp("^")) {
      this.i++;
      // x^{\circ} -> degrees (and ^{\circ}C -> Celsius)
      if (this.isOp("°") || (this.isOp("{") && this.isOp("°", this.peek()) && this.isOp("}", this.peek(2)))) {
        this.i += this.isOp("°") ? 1 : 3;
        return this.parsePostfix({ type: "mul", l: base, r: this.degreeUnit() });
      }
      const exp = this.isOp("-") ? (this.i++, this.negate(this.parsePowOperand())) : this.parsePowOperand();
      base = { type: "pow", l: base, r: exp };
      base = this.parsePostfix(base);
    }
    return base;
  }

  private negate(n: Node): Node {
    return n.type === "num" ? { type: "num", value: numNeg(n.value) } : { type: "neg", arg: n };
  }

  private parsePowOperand(): Node {
    // Right-associative: 2^3^2 = 2^(3^2)
    return this.parsePow();
  }

  private degreeUnit(): Node {
    // Look for a following C / F / \mathrm{C}
    const t = this.tok;
    let letter: string | undefined;
    if (t.t === "id" && (t.s === "C" || t.s === "F" || t.s === "R")) letter = t.s;
    if (t.t === "raw" && /^\s*[CFR]\s*$/.test(t.args[0]) && t.cmd !== "operatorname") letter = t.args[0].trim();
    if (letter) {
      this.i++;
      return { type: "unit", name: "°" + letter };
    }
    return { type: "unit", name: "°" };
  }

  private parsePostfix(n: Node): Node {
    for (;;) {
      if (this.eat("!")) n = { type: "fact", arg: n };
      else if (this.eat("%")) n = { type: "pct", arg: n };
      else if (this.eat("°")) n = { type: "mul", l: n, r: this.degreeUnit() };
      else return n;
    }
  }

  private parseArgs(close: string): Node[] {
    const args: Node[] = [];
    if (this.eat(close)) return args;
    for (;;) {
      args.push(this.parseWith());
      if (this.eat(",")) continue;
      this.expect(close);
      return args;
    }
  }

  private parseGroupArg(): Node {
    // LaTeX argument: {expr} or a single token
    if (this.eat("{")) {
      const n = this.parseWith();
      this.expect("}");
      return n;
    }
    return this.parsePrimary();
  }

  private makeCall(name: string, args: Node[]): Node {
    const canon = canonicalFunc(name);
    if (canon === "cbrt")
      return { type: "call", name: "root", args: [args[0], { type: "num", value: parseDecimal("3") }] };
    if (canon) return { type: "call", name: canon, args };
    return { type: "call", name, args };
  }

  private isFunctionName(name: string): boolean {
    return !!canonicalFunc(name) || !!this.opts.userFuncs?.has(name);
  }

  private parsePrimary(): Node {
    const t = this.tok;
    switch (t.t) {
      case "num": {
        this.i++;
        const isDecimal = /[.E]/.test(t.s);
        const value = isDecimal && !this.opts.exactDecimals ? fl(Number(t.s)) : parseDecimal(t.s);
        return { type: "num", value };
      }
      case "id": {
        this.i++;
        if (t.s === "true" || t.s === "false") return { type: "bool", value: t.s === "true" };
        if (this.isOp("(") && (t.fn || this.isFunctionName(t.s))) {
          this.i++;
          return this.makeCall(t.s, this.parseArgs(")"));
        }
        if (t.s === "e") return { type: "const", name: "e" };
        if (t.s === "pi") return { type: "const", name: "π" };
        return { type: "var", name: t.s };
      }
      case "unit": {
        this.i++;
        const u = lookupNspire(t.s);
        if (!u) throw new ParseError(`Unknown unit _${t.s}`);
        return { type: "unit", name: u.nspire };
      }
      case "cmd":
        this.i++;
        return this.parseCommand(t.s);
      case "raw":
        this.i++;
        return this.parseRaw(t.cmd, t.args);
      case "op":
        break;
      case "kw":
        throw new ParseError(`Unexpected "${t.s}"`);
      case "eof":
        throw new ParseError("Unexpected end of input");
    }
    const s = t.s;
    this.i++;
    switch (s) {
      case "(": {
        const n = this.parseWith();
        this.expect(")");
        return n;
      }
      case "[": {
        const items = this.parseArgs("]");
        return items.length === 1 ? items[0] : { type: "list", items };
      }
      case "{": {
        const items = this.parseArgs("}");
        if (items.length === 1 && this.latex) return items[0];
        return { type: "list", items };
      }
      case "∫": {
        this.expect("(");
        return { type: "call", name: "integral", args: this.parseArgs(")") };
      }
      case "√": {
        const arg = this.isOp("(") ? this.parsePrimary() : this.parsePow();
        return { type: "call", name: "sqrt", args: [arg] };
      }
      case "π":
        return { type: "const", name: "π" };
      case "ℯ":
        return { type: "const", name: "e" };
      case "∞":
        return { type: "const", name: "∞" };
      case "^":
        // A standalone degree unit, e.g. a conversion target: \blacktriangleright ^{\circ}F
        if (this.isOp("°") || (this.isOp("{") && this.isOp("°", this.peek()) && this.isOp("}", this.peek(2)))) {
          this.i += this.isOp("°") ? 1 : 3;
          return this.degreeUnit();
        }
        break;
      case "|L":
      case "|A": {
        this.absDepth++;
        const n = this.parseWith();
        this.absDepth--;
        if (!this.eat("|R") && !this.eat("|A")) throw new ParseError("Unclosed |");
        return { type: "call", name: "abs", args: [n] };
      }
    }
    throw new ParseError(`Unexpected ${describe(t)}`);
  }

  private parseCommand(name: string): Node {
    if (name === "frac") {
      const a = this.parseGroupArg();
      const b = this.parseGroupArg();
      // \frac{d}{dx} f  →  d(f, x)
      const isD = (n: Node) => (n.type === "var" && n.name === "d") || (n.type === "unit" && n.name === "day");
      if (isD(a) && b.type === "mul" && isD(b.l) && b.r.type === "var") {
        return { type: "call", name: "d", args: [this.parsePow(), b.r] };
      }
      return { type: "div", l: a, r: b };
    }
    if (name === "int" || name === "sum" || name === "prod") {
      let lo: Node | undefined, hi: Node | undefined;
      for (let k = 0; k < 2; k++) {
        if (this.eat("_")) lo = this.parseGroupArg();
        else if (this.eat("^")) hi = this.parseGroupArg();
      }
      if (name === "int") {
        this.integralDepth++;
        const body = this.parseAdd();
        this.integralDepth--;
        if (!this.isDifferential()) throw new ParseError("Expected dx after the integral");
        this.i++;
        const v = this.tok as Extract<Tok, { t: "id" }>;
        this.i++;
        const x: Node = { type: "var", name: v.s };
        if (!lo || !hi) return { type: "call", name: "integral", args: [body, x] };
        return { type: "call", name: "nint", args: [body, x, lo, hi] };
      }
      if (!lo || !hi || lo.type !== "rel" || lo.l.type !== "var") throw new ParseError(`\\${name} needs _{k=a}^{b}`);
      const body = this.parseMul();
      return { type: "call", name: name === "sum" ? "sum" : "product", args: [body, lo.l, lo.r, hi] };
    }
    if (name === "binom") {
      const a = this.parseGroupArg();
      const b = this.parseGroupArg();
      return { type: "call", name: "ncr", args: [a, b] };
    }
    if (name === "sqrt") {
      if (this.eat("[")) {
        const n = this.parseWith();
        this.expect("]");
        return { type: "call", name: "root", args: [this.parseGroupArg(), n] };
      }
      return { type: "call", name: "sqrt", args: [this.parseGroupArg()] };
    }
    // Function command: \sin, \log_{b}, \sin^{-1}, \sin^2 x
    let fname = name === "lg" ? "log" : name === "coth" ? "cot" : name;
    let power: Node | undefined;
    let base: Node | undefined;
    for (;;) {
      if (this.eat("^")) {
        const p = this.parseGroupArg();
        if (
          p.type === "num" &&
          p.value.e &&
          p.value.n === -1n &&
          p.value.d === 1n &&
          ["sin", "cos", "tan", "sinh", "cosh", "tanh"].includes(fname)
        ) {
          fname = "arc" + fname;
        } else power = p;
      } else if (this.eat("_")) {
        base = this.parseGroupArg();
      } else break;
    }
    let args: Node[];
    if (this.eat("(")) args = this.parseArgs(")");
    else if (this.isOp("{") || this.isOp("[")) args = [this.parsePrimary()];
    else {
      // \sin 2x -> sin(2x): implicit product of following factors
      let a = this.parsePow();
      while (this.startsPrimary() && this.tok.t !== "cmd" && !(this.tok.t === "id" && this.tok.fn)) {
        a = { type: "mul", l: a, r: this.parsePow(), implicit: true };
      }
      args = [a];
    }
    if (fname === "log") {
      if (base) args = [args[0], base];
    }
    let call = this.makeCall(fname, args);
    if (power) call = { type: "pow", l: call, r: power };
    return call;
  }

  private parseRaw(cmd: string, args: string[]): Node {
    const content = args[0].trim();
    if (cmd === "SI" || cmd === "qty") {
      const n = parse(args[0], this.opts).node;
      const u = parseUnitTex(args[1], true);
      if (!u) throw new ParseError(`Unknown unit ${args[1]}`);
      return { type: "mul", l: n, r: u };
    }
    if (cmd === "num") return parse(args[0].replace(/e/g, "E"), this.opts).node;
    if (cmd === "ang") return { type: "mul", l: parse(args[0], this.opts).node, r: { type: "unit", name: "°" } };
    if (cmd === "mathring") {
      if (content === "A") return { type: "unit", name: "Å" };
      throw new ParseError(`Unsupported \\mathring{${content}}`);
    }
    if (cmd === "si" || cmd === "unit") {
      const u = parseUnitTex(content, true);
      if (!u) throw new ParseError(`Unknown unit ${content}`);
      return u;
    }
    // Function names: \operatorname{solve}( ... ), \mathrm{nSolve}( ... )
    const plain = content.replace(/\\Delta\s*/g, "Δ").replace(/\s+/g, "");
    if (this.isOp("(") && (cmd === "operatorname" || this.isFunctionName(plain))) {
      this.i++;
      return this.makeCall(plain, this.parseArgs(")"));
    }
    if (cmd === "operatorname") return { type: "var", name: plain };
    if (plain === "e") return { type: "const", name: "e" };
    const italic = cmd === "mathit" || cmd === "textit" || cmd === "mathbf" || cmd === "textbf";
    if (!italic) {
      const u = parseUnitTex(content, false);
      if (u) return u;
    }
    if (/^[\p{L}][\p{L}\p{N}_]*$/u.test(plain)) {
      if (plain === "true" || plain === "false") return { type: "bool", value: plain === "true" };
      return { type: "var", name: plain };
    }
    throw new ParseError(`Unknown unit "${content}"`);
  }
}

function describe(t: Tok): string {
  switch (t.t) {
    case "eof":
      return "end of input";
    case "raw":
      return `\\${t.cmd}`;
    case "cmd":
      return `\\${t.s}`;
    default:
      return `"${t.s.replace(/^\|[ALR]$/, "|")}"`;
  }
}

const SIUNITX: Record<string, string> = {
  metre: "m",
  meter: "m",
  second: "s",
  gram: "g",
  kilogram: "kg",
  ampere: "A",
  kelvin: "K",
  mole: "mol",
  candela: "cd",
  newton: "N",
  joule: "J",
  watt: "W",
  pascal: "Pa",
  hertz: "Hz",
  coulomb: "C",
  volt: "V",
  ohm: "Ω",
  farad: "F",
  henry: "H",
  tesla: "T",
  weber: "Wb",
  siemens: "S",
  liter: "L",
  litre: "L",
  hour: "h",
  minute: "min",
  day: "d",
  degree: "°",
  celsius: "°C",
  degreeCelsius: "°C",
  electronvolt: "eV",
  bar: "bar",
  radian: "rad",
  becquerel: "Bq",
  gray: "Gy",
  sievert: "Sv",
  angstrom: "Å",
  tonne: "t",
  dalton: "Da",
  astronomicalunit: "au",
  arcminute: "'",
  arcsecond: '"',
  mmHg: "mmHg",
};

const SIPREFIX: Record<string, string> = {
  yotta: "Y",
  zetta: "Z",
  exa: "E",
  peta: "P",
  tera: "T",
  giga: "G",
  mega: "M",
  kilo: "k",
  hecto: "h",
  deka: "da",
  deca: "da",
  deci: "d",
  centi: "c",
  milli: "m",
  micro: "μ",
  nano: "n",
  pico: "p",
  femto: "f",
  atto: "a",
};

/**
 * Parses unit text from \mathrm{...}, \text{...}, \si{...} or \qty{..}{...}
 * ("km/h", "kg\,m^{2}", "\kilo\meter\per\second", "J/(kg K)") into unit nodes.
 * Returns null when some part is not a unit.
 */
export function parseUnitTex(content: string, siunitx: boolean): Node | null {
  const whole = lookupTex(content);
  if (whole && content.trim()) return { type: "unit", name: whole.nspire };
  let s = content;
  if (siunitx || /\\(per|kilo|meter|metre|second|squared|cubed|square|cubic)\b/.test(s)) {
    s = s
      .replace(/\\square\s*((?:\\[a-zA-Z]+\s*)*?\\[a-zA-Z]+)/g, "$1\\squared")
      .replace(/\\cubic\s*((?:\\[a-zA-Z]+\s*)*?\\[a-zA-Z]+)/g, "$1\\cubed")
      .replace(/\\per\b/g, " / ")
      .replace(/\\squared\b/g, "^2 ")
      .replace(/\\cubed\b/g, "^3 ")
      .replace(/\\tothe\s*\{([^}]*)\}/g, "^{$1} ")
      .replace(/\\([a-zA-Z]+)/g, (m, name) => {
        if (name in SIPREFIX) return " " + SIPREFIX[name] + "§";
        if (name in SIUNITX) return SIUNITX[name] + " ";
        return m;
      })
      .replace(/§\s*/g, "");
  }
  s = s
    .replace(/\\mu\b\s*|µ/g, "μ")
    .replace(/\\Omega\b\s*/g, "Ω")
    .replace(/\\ohm\b\s*/g, "Ω")
    .replace(/\\(AA|angstrom)\b\s*/g, "Å")
    .replace(/\\varepsilon\b\s*|\\epsilon\b\s*/g, "ε")
    .replace(/\\sigma\b\s*/g, "σ")
    .replace(/\\Phi\b\s*/g, "Φ")
    .replace(/\\infty\b\s*/g, "∞")
    .replace(/\^\s*\{?\s*\\circ\s*\}?|\\circ\b|\\degree\b|\\textdegree\b/g, "°")
    .replace(/\\(cdot|times|ast)\b/g, "*")
    .replace(/\\[,;:! ]|~/g, " ")
    .replace(/\\(mathrm|text|rm|textrm)\s*/g, "");
  if (/\\/.test(s)) return null;

  type UT = { k: "atom"; s: string } | { k: "op"; s: string } | { k: "num"; s: string };
  const toks: UT[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    const last = toks[toks.length - 1];
    if (/[\s*.·]/.test(c)) {
      if (last && !(last.k === "op" && (last.s === "*" || last.s === "/" || last.s === "(")))
        toks.push({ k: "op", s: "*" });
      i++;
    } else if (c === "/" || c === ")") {
      if (last?.k === "op" && last.s === "*") toks.pop();
      toks.push({ k: "op", s: c });
      i++;
    } else if (c === "(") {
      toks.push({ k: "op", s: c });
      i++;
    } else if (c === "{" || c === "}") {
      toks.push({ k: "op", s: c === "{" ? "(" : ")" });
      i++;
    } else if (c === "^") {
      if (last?.k === "op" && last.s === "*") toks.pop();
      i++;
      while (s[i] === " ") i++;
      let e: string;
      if (s[i] === "{") {
        const [content2, j] = readBraced(s, i);
        e = content2.trim();
        i = j;
      } else {
        const m = /^[+-]?\d+/.exec(s.slice(i));
        if (!m) return null;
        e = m[0];
        i += m[0].length;
      }
      if (!/^[+-]?\d+(\.\d+)?$|^[+-]?\d+\/\d+$/.test(e)) return null;
      toks.push({ k: "op", s: "^" }, { k: "num", s: e });
    } else {
      const m = /^(°[CFRK]?|[\p{L}'"°]+)(_\{[^}]*\}|_[A-Za-z0-9])?/u.exec(s.slice(i));
      if (!m) return null;
      toks.push({ k: "atom", s: m[0] });
      i += m[0].length;
    }
  }

  while (toks.length && toks[toks.length - 1].k === "op" && toks[toks.length - 1].s === "*") toks.pop();
  let p = 0;
  const factor = (): Node | null => {
    const t = toks[p];
    if (!t) return null;
    let n: Node | null;
    if (t.k === "op" && t.s === "(") {
      p++;
      n = expr();
      if (!n || !(toks[p]?.k === "op" && toks[p].s === ")")) return null;
      p++;
    } else if (t.k === "atom") {
      p++;
      const u = lookupTex(t.s);
      if (!u) return null;
      n = { type: "unit", name: u.nspire };
    } else return null;
    if (toks[p]?.k === "op" && toks[p].s === "^") {
      const e = toks[p + 1];
      p += 2;
      const [a, b] = e.s.split("/");
      const val = b ? parseDecimal(a) : parseDecimal(e.s.replace(/^\+/, "").replace(/^-/, ""));
      let expNode: Node = b
        ? {
            type: "div",
            l: { type: "num", value: parseDecimal(a.replace(/^-/, "")) },
            r: { type: "num", value: parseDecimal(b) },
          }
        : { type: "num", value: val };
      if (e.s.startsWith("-")) {
        expNode =
          expNode.type === "num" ? { type: "num", value: numNeg(expNode.value) } : { type: "neg", arg: expNode };
      }
      n = { type: "pow", l: n, r: expNode };
    }
    return n;
  };
  const expr = (): Node | null => {
    while (toks[p]?.k === "op" && toks[p].s === "*") p++;
    let l = factor();
    if (!l) return null;
    for (;;) {
      const t = toks[p];
      if (!t || (t.k === "op" && t.s === ")")) return l;
      if (t.k === "op" && t.s === "/") {
        p++;
        while (toks[p]?.k === "op" && toks[p].s === "*") p++;
        const r = factor();
        if (!r) return null;
        l = { type: "div", l, r };
      } else if (t.k === "op" && t.s === "*") {
        p++;
        if (!toks[p] || (toks[p].k === "op" && toks[p].s === ")")) continue;
        if (toks[p].k === "op" && toks[p].s === "/") continue;
        const r = factor();
        if (!r) return null;
        l = { type: "mul", l, r };
      } else {
        const r = factor();
        if (!r) return null;
        l = { type: "mul", l, r };
      }
    }
  };
  const n = expr();
  if (!n || p !== toks.length) return null;
  return n;
}

export function parse(input: string, opts: ParseOptions = {}): Parsed {
  const s = normalizeInput(input);
  const latex = looksLikeLatex(s);
  const toks = lex(s, latex);
  const node = new Parser(toks, latex, opts).parseTop();
  return { node, latex };
}
