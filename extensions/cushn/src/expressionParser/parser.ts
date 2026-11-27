import { ParseError, type AstNode, type Operator, type Token } from "./types";

/**
 * Splits the token stream into the leading title (WORD tokens) and the
 * trailing expression. The expression starts at the first NUMBER or LPAREN.
 *
 * Words appearing *after* the expression begins are treated as an error —
 * the title belongs at the front, otherwise we'd be guessing.
 */
export function splitTitleAndExpression(tokens: Token[]): {
  titleTokens: Token[];
  exprTokens: Token[];
} {
  const titleTokens: Token[] = [];
  let i = 0;
  while (i < tokens.length && tokens[i].type === "WORD") {
    titleTokens.push(tokens[i]);
    i++;
  }
  const exprTokens = tokens.slice(i);
  for (const t of exprTokens) {
    if (t.type === "WORD") {
      throw new ParseError(
        `Unexpected word "${t.value}" inside numeric expression`,
        t.position,
      );
    }
  }
  return { titleTokens, exprTokens };
}

/**
 * Recursive-descent parser with standard arithmetic precedence:
 *   expr   = term (('+' | '-') term)*
 *   term   = factor (('*' | '/') factor)*
 *   factor = NUMBER | '(' expr ')'
 */
export function parseExpression(tokens: Token[]): AstNode {
  if (tokens.length === 0) {
    throw new ParseError("Empty expression");
  }
  const state = { tokens, pos: 0 };
  const node = parseAddSub(state);
  if (state.pos < state.tokens.length) {
    const t = state.tokens[state.pos];
    throw new ParseError(`Unexpected token "${t.value}"`, t.position);
  }
  return node;
}

interface ParseState {
  tokens: Token[];
  pos: number;
}

const peek = (s: ParseState): Token | undefined => s.tokens[s.pos];

function parseAddSub(s: ParseState): AstNode {
  let left = parseMulDiv(s);
  while (true) {
    const tok = peek(s);
    if (tok?.type === "OPERATOR" && (tok.value === "+" || tok.value === "-")) {
      s.pos++;
      const right = parseMulDiv(s);
      left = { kind: "binary", op: tok.value as Operator, left, right };
    } else {
      break;
    }
  }
  return left;
}

function parseMulDiv(s: ParseState): AstNode {
  let left = parseFactor(s);
  while (true) {
    const tok = peek(s);
    if (tok?.type === "OPERATOR" && (tok.value === "*" || tok.value === "/")) {
      s.pos++;
      const right = parseFactor(s);
      left = { kind: "binary", op: tok.value as Operator, left, right };
    } else {
      break;
    }
  }
  return left;
}

function parseFactor(s: ParseState): AstNode {
  const tok = peek(s);
  if (!tok) throw new ParseError("Unexpected end of expression");

  if (tok.type === "NUMBER") {
    s.pos++;
    return { kind: "number", value: tok.numericValue ?? Number(tok.value) };
  }

  if (tok.type === "LPAREN") {
    s.pos++;
    const inner = parseAddSub(s);
    const close = peek(s);
    if (close?.type !== "RPAREN") {
      throw new ParseError("Missing closing parenthesis", tok.position);
    }
    s.pos++;
    return inner;
  }

  // Unary minus: "-5" or after an opening paren.
  if (tok.type === "OPERATOR" && (tok.value === "-" || tok.value === "+")) {
    s.pos++;
    const operand = parseFactor(s);
    if (tok.value === "-") {
      return { kind: "binary", op: "-", left: { kind: "number", value: 0 }, right: operand };
    }
    return operand;
  }

  throw new ParseError(`Unexpected token "${tok.value}"`, tok.position);
}
