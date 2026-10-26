/**
 * A formula that works out a jamaat time, in a small Python-like language with no way to run code:
 * numbers (minutes after midnight), names the extension provides (`start`, `end`, ...), `+ - * / // % **`,
 * comparisons, `and or not`, `a if cond else b`, and a few functions (`ceil(x, step)`, `floor`, `round`,
 * `min`, `max`, `abs`, `clamp`, `at(hour, minute)`). `at(13, 30)` is 1:30 PM.
 *
 * A port of the phone app's lib/core/engine/rule_expr.dart, with the same behaviour and error messages.
 */

/** A name's value, worked out only when the formula uses it (it may throw an {@link ExprError}). */
export type NameValues = Record<string, () => number>;

/** What is wrong with a formula, and where (0-based) when known. */
export class ExprError extends Error {
  constructor(
    message: string,
    readonly at?: number,
  ) {
    super(message);
  }

  /** The message with its 1-based position, e.g. `Unknown name 'foo' (at 1)`. */
  override toString(): string {
    return this.at === undefined ? this.message : `${this.message} (at ${this.at + 1})`;
  }
}

type Value = number | boolean;

// ── Lexer ────────────────────────────────────────────────────────────────────────────────────────

type TokType = "num" | "name" | "op" | "lparen" | "rparen" | "comma" | "end";

interface Tok {
  type: TokType;
  text: string;
  at: number;
  value: number;
}

const TWO_CHAR_OPS = ["//", "**", "<=", ">=", "==", "!="];

function lex(s: string): Tok[] {
  const out: Tok[] = [];
  const tok = (type: TokType, text: string, at: number, value = 0) => out.push({ type, text, at, value });
  const digit = (c: string | undefined) => c !== undefined && c >= "0" && c <= "9";
  const letter = (c: string | undefined) =>
    c !== undefined && ((c >= "A" && c <= "Z") || (c >= "a" && c <= "z") || c === "_");
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
    } else if (digit(c) || (c === "." && digit(s[i + 1]))) {
      const from = i;
      while (i < s.length && (digit(s[i]) || s[i] === ".")) i++;
      const text = s.slice(from, i);
      // Like Dart's double.tryParse: one decimal point at most.
      if (!/^(\d+\.?\d*|\.\d+)$/.test(text)) throw new ExprError(`Not a number: ${text}`, from);
      tok("num", text, from, Number(text));
    } else if (letter(c)) {
      const from = i;
      while (i < s.length && (letter(s[i]) || digit(s[i]))) i++;
      tok("name", s.slice(from, i), from);
    } else if (c === "(") {
      tok("lparen", "(", i++);
    } else if (c === ")") {
      tok("rparen", ")", i++);
    } else if (c === ",") {
      tok("comma", ",", i++);
    } else {
      // Two-character operators first.
      const two = s.slice(i, i + 2);
      if (TWO_CHAR_OPS.includes(two)) {
        tok("op", two, i);
        i += 2;
      } else if ("+-*/%<>".includes(c)) {
        tok("op", c, i++);
      } else {
        throw new ExprError(`Unexpected '${c}'`, i);
      }
    }
  }
  tok("end", "", s.length);
  return out;
}

// ── Syntax tree ──────────────────────────────────────────────────────────────────────────────────

type Node =
  | { kind: "lit"; value: Value }
  | { kind: "name"; name: string; at: number }
  | { kind: "unary"; op: string; x: Node; at: number }
  | { kind: "binary"; op: string; a: Node; b: Node; at: number }
  | { kind: "cond"; then: Node; cond: Node; otherwise: Node }
  | { kind: "chain"; operands: Node[]; ops: string[] }
  | { kind: "call"; fn: string; args: Node[]; at: number };

const num = (v: Value) => (typeof v === "boolean" ? (v ? 1 : 0) : v);
const truthy = (v: Value) => (typeof v === "boolean" ? v : v !== 0);

function evalNode(n: Node, names: NameValues): Value {
  switch (n.kind) {
    case "lit":
      return n.value;
    case "name": {
      if (n.name === "True") return true;
      if (n.name === "False") return false;
      const f = Object.prototype.hasOwnProperty.call(names, n.name) ? names[n.name] : undefined;
      if (!f) throw new ExprError(`Unknown name '${n.name}'`, n.at);
      return f();
    }
    case "unary": {
      const v = evalNode(n.x, names);
      if (n.op === "not") return !truthy(v);
      return n.op === "-" ? -num(v) : num(v);
    }
    case "cond":
      return truthy(evalNode(n.cond, names)) ? evalNode(n.then, names) : evalNode(n.otherwise, names);
    case "binary":
      return evalBinary(n, names);
    case "chain": {
      // Python's a < b <= c: each pair compared, the middle worked out once, stopping at the first false.
      let left = num(evalNode(n.operands[0], names));
      for (let i = 0; i < n.ops.length; i++) {
        const right = num(evalNode(n.operands[i + 1], names));
        if (!compare(n.ops[i], left, right)) return false;
        left = right;
      }
      return true;
    }
    case "call":
      return evalCall(
        n.fn,
        n.args.map((a) => num(evalNode(a, names))),
        n.at,
      );
  }
}

function evalBinary(n: Extract<Node, { kind: "binary" }>, names: NameValues): Value {
  // Python's and / or give back an operand, and skip the right side when the left decides.
  if (n.op === "and") {
    const l = evalNode(n.a, names);
    return truthy(l) ? evalNode(n.b, names) : l;
  }
  if (n.op === "or") {
    const l = evalNode(n.a, names);
    return truthy(l) ? l : evalNode(n.b, names);
  }
  const x = num(evalNode(n.a, names));
  const y = num(evalNode(n.b, names));
  switch (n.op) {
    case "+":
      return x + y;
    case "-":
      return x - y;
    case "*":
      return x * y;
    case "/":
      if (y === 0) throw new ExprError("Division by zero", n.at);
      return x / y;
    case "//":
      if (y === 0) throw new ExprError("Division by zero", n.at);
      return Math.floor(x / y);
    case "%":
      if (y === 0) throw new ExprError("Division by zero", n.at);
      // Python's modulo takes the sign of the divisor.
      return x - y * Math.floor(x / y);
    case "**":
      return Math.pow(x, y);
  }
  if (COMPARISONS.includes(n.op)) return compare(n.op, x, y);
  throw new ExprError(`Unknown operator '${n.op}'`, n.at);
}

function compare(op: string, x: number, y: number): boolean {
  switch (op) {
    case "<":
      return x < y;
    case "<=":
      return x <= y;
    case ">":
      return x > y;
    case ">=":
      return x >= y;
    case "==":
      return x === y;
    default:
      return x !== y;
  }
}

function evalCall(fn: string, v: number[], at: number): number {
  const arity = (lo: number, hi: number) => {
    if (v.length < lo || v.length > hi) {
      throw new ExprError(`${fn}() takes ${lo === hi ? lo : `${lo} to ${hi}`} values, not ${v.length}`, at);
    }
  };
  const stepOf = () => {
    const step = v.length > 1 ? v[1] : 1;
    if (step <= 0) throw new ExprError(`${fn}() needs a step above 0`, at);
    return step;
  };
  switch (fn) {
    case "ceil":
      arity(1, 2);
      return Math.ceil(v[0] / stepOf()) * stepOf();
    case "floor":
      arity(1, 2);
      return Math.floor(v[0] / stepOf()) * stepOf();
    case "round":
      arity(1, 2);
      // Halves go up, as the jamaat rounding does.
      return Math.floor(v[0] / stepOf() + 0.5) * stepOf();
    case "abs":
      arity(1, 1);
      return Math.abs(v[0]);
    case "min":
      arity(1, 16);
      return Math.min(...v);
    case "max":
      arity(1, 16);
      return Math.max(...v);
    case "clamp":
      arity(3, 3);
      return v[0] < v[1] ? v[1] : v[0] > v[2] ? v[2] : v[0];
    case "at":
      arity(1, 2);
      return v[0] * 60 + (v.length > 1 ? v[1] : 0);
  }
  throw new ExprError(`Unknown function '${fn}'`, at);
}

function namesOf(n: Node): Set<string> {
  switch (n.kind) {
    case "lit":
      return new Set();
    case "name":
      return new Set(n.name === "True" || n.name === "False" ? [] : [n.name]);
    case "unary":
      return namesOf(n.x);
    case "binary":
      return new Set([...namesOf(n.a), ...namesOf(n.b)]);
    case "cond":
      return new Set([...namesOf(n.then), ...namesOf(n.cond), ...namesOf(n.otherwise)]);
    case "chain":
      return new Set(n.operands.flatMap((o) => [...namesOf(o)]));
    case "call":
      return new Set(n.args.flatMap((a) => [...namesOf(a)]));
  }
}

// ── Parser (lowest to highest precedence) ─────────────────────────────────────────────────────────

const COMPARISONS = ["<", "<=", ">", ">=", "==", "!="];
const RESERVED = ["if", "else", "and", "or", "not"];

class Parser {
  private i = 0;

  constructor(private readonly t: Tok[]) {}

  private cur(): Tok {
    return this.t[this.i];
  }

  private isOp(o: string): boolean {
    return this.cur().type === "op" && this.cur().text === o;
  }

  private isWord(w: string): boolean {
    return this.cur().type === "name" && this.cur().text === w;
  }

  parseAll(): Node {
    if (this.t.length === 1) throw new ExprError("Write a formula, for example ceil(start, 15) + 15");
    const n = this.ternary();
    if (this.cur().type !== "end") throw new ExprError(`Unexpected '${this.cur().text}'`, this.cur().at);
    return n;
  }

  private ternary(): Node {
    const then = this.or();
    if (this.isWord("if")) {
      this.i++;
      const cond = this.or();
      if (!this.isWord("else")) throw new ExprError("Expected 'else' after the condition", this.cur().at);
      this.i++;
      return { kind: "cond", then, cond, otherwise: this.ternary() };
    }
    return then;
  }

  private or(): Node {
    let l = this.and();
    while (this.isWord("or")) {
      const at = this.cur().at;
      this.i++;
      l = { kind: "binary", op: "or", a: l, b: this.and(), at };
    }
    return l;
  }

  private and(): Node {
    let l = this.not();
    while (this.isWord("and")) {
      const at = this.cur().at;
      this.i++;
      l = { kind: "binary", op: "and", a: l, b: this.not(), at };
    }
    return l;
  }

  private not(): Node {
    if (this.isWord("not")) {
      const at = this.cur().at;
      this.i++;
      return { kind: "unary", op: "not", x: this.not(), at };
    }
    return this.compare();
  }

  private compare(): Node {
    const first = this.sum();
    const operands = [first];
    const ops: { op: string; at: number }[] = [];
    while (this.cur().type === "op" && COMPARISONS.includes(this.cur().text)) {
      const { text: op, at } = this.cur();
      this.i++;
      ops.push({ op, at });
      operands.push(this.sum());
    }
    if (ops.length === 0) return first;
    if (ops.length === 1) return { kind: "binary", op: ops[0].op, a: first, b: operands[1], at: ops[0].at };
    return { kind: "chain", operands, ops: ops.map((o) => o.op) };
  }

  private sum(): Node {
    let l = this.term();
    while (this.isOp("+") || this.isOp("-")) {
      const { text: op, at } = this.cur();
      this.i++;
      l = { kind: "binary", op, a: l, b: this.term(), at };
    }
    return l;
  }

  private term(): Node {
    let l = this.unary();
    while (this.isOp("*") || this.isOp("/") || this.isOp("//") || this.isOp("%")) {
      const { text: op, at } = this.cur();
      this.i++;
      l = { kind: "binary", op, a: l, b: this.unary(), at };
    }
    return l;
  }

  private unary(): Node {
    if (this.isOp("-") || this.isOp("+")) {
      const { text: op, at } = this.cur();
      this.i++;
      return { kind: "unary", op, x: this.unary(), at };
    }
    return this.power();
  }

  private power(): Node {
    const base = this.primary();
    if (this.isOp("**")) {
      const at = this.cur().at;
      this.i++;
      // Right-associative, and binds tighter than a unary minus on its left (-2 ** 2 is -4), as in Python.
      return { kind: "binary", op: "**", a: base, b: this.unary(), at };
    }
    return base;
  }

  private primary(): Node {
    const tok = this.cur();
    switch (tok.type) {
      case "num":
        this.i++;
        return { kind: "lit", value: tok.value };
      case "lparen": {
        this.i++;
        const n = this.ternary();
        if (this.cur().type !== "rparen") throw new ExprError("Expected ')'", this.cur().at);
        this.i++;
        return n;
      }
      case "name": {
        if (RESERVED.includes(tok.text)) throw new ExprError(`Unexpected '${tok.text}'`, tok.at);
        this.i++;
        if (this.cur().type !== "lparen") return { kind: "name", name: tok.text, at: tok.at };
        this.i++;
        const args: Node[] = [];
        if (this.cur().type !== "rparen") {
          args.push(this.ternary());
          while (this.cur().type === "comma") {
            this.i++;
            args.push(this.ternary());
          }
        }
        if (this.cur().type !== "rparen") throw new ExprError("Expected ')'", this.cur().at);
        this.i++;
        return { kind: "call", fn: tok.text, args, at: tok.at };
      }
      case "end":
        throw new ExprError("The formula ends too soon", tok.at);
      default:
        throw new ExprError(`Unexpected '${tok.text}'`, tok.at);
    }
  }
}

/** A parsed formula. */
export class RuleExpression {
  private static readonly cache = new Map<string, RuleExpression>();

  private constructor(
    readonly source: string,
    private readonly root: Node,
  ) {}

  /**
   * Parse a formula.
   *
   * @param source - Formula text.
   * @returns The parsed formula.
   * @throws ExprError naming what is wrong and where.
   */
  static parse(source: string): RuleExpression {
    return new RuleExpression(source, new Parser(lex(source)).parseAll());
  }

  /**
   * A parsed formula, kept for the next call (a schedule evaluates it for many days).
   *
   * @param source - Formula text.
   * @returns The parsed formula.
   * @throws ExprError when it doesn't parse.
   */
  static cached(source: string): RuleExpression {
    const hit = RuleExpression.cache.get(source);
    if (hit) return hit;
    if (RuleExpression.cache.size > 64) RuleExpression.cache.clear();
    const parsed = RuleExpression.parse(source);
    RuleExpression.cache.set(source, parsed);
    return parsed;
  }

  /**
   * The formula's value, in minutes.
   *
   * @param names - Each name's value, looked up only when the formula uses it.
   * @returns The value.
   * @throws ExprError when it can't be worked out.
   */
  evaluate(names: NameValues): number {
    const v = num(evalNode(this.root, names));
    if (!Number.isFinite(v)) throw new ExprError("The result is not a number");
    return v;
  }

  /** The names the formula uses (for checking them before evaluating). */
  get names(): Set<string> {
    return namesOf(this.root);
  }
}
