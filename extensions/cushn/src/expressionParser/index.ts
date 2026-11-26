import { type CurrencyRegistry } from "./currencies";
import { evaluate } from "./evaluator";
import { parseExpression, splitTitleAndExpression } from "./parser";
import { tokenize } from "./tokenizer";
import { ParseError, type ParsedResult, type Token } from "./types";
import { type UnitRegistry } from "./units";

export interface ParseInputOptions {
  units?: UnitRegistry;
  /**
   * Optional currency registry. When provided, currency annotations on
   * numbers (e.g. "200 eur", "$200", "200₸") are converted to the base
   * currency at tokenize time. Each leaf is converted independently, so
   * mixed-currency expressions like "200 eur + 50 usd" are supported.
   */
  currencies?: CurrencyRegistry;
}

/**
 * Parses an input like `"coffee 20k + 300k"` into `{ title, amount, currencies }`.
 *
 * Pipeline: tokenize → split title/expression → parse to AST → evaluate.
 * Throws `ParseError` for malformed input; use `tryParseInput` for a
 * non-throwing variant that returns `null` instead.
 */
export function parseInput(input: string, options: ParseInputOptions = {}): ParsedResult {
  if (typeof input !== "string" || input.trim() === "") {
    throw new ParseError("Input must be a non-empty string");
  }

  const tokens = tokenize(input, options);
  const { titleTokens, exprTokens } = splitTitleAndExpression(tokens);

  if (titleTokens.length === 0) {
    throw new ParseError("Missing title");
  }
  if (exprTokens.length === 0) {
    throw new ParseError("Missing numeric expression");
  }

  const ast = parseExpression(exprTokens);
  const amount = evaluate(ast);

  const title = titleTokens.map((t) => t.value).join(" ");
  return { title, amount, currencies: currenciesOf(exprTokens) };
}

export function tryParseInput(
  input: string,
  options: ParseInputOptions = {},
): ParsedResult | null {
  try {
    return parseInput(input, options);
  } catch (e) {
    if (e instanceof ParseError) return null;
    throw e;
  }
}

/**
 * Like `parseInput` but fills in defaults when the title or numeric expression
 * is absent. Returns `null` for empty/whitespace input. Still throws
 * `ParseError` for genuinely malformed input (bad syntax, stray tokens, etc.).
 */
export function parseInputLenient(
  input: string,
  options: ParseInputOptions = {},
): ParsedResult | null {
  if (typeof input !== "string" || input.trim() === "") return null;

  const tokens = tokenize(input, options);
  const { titleTokens, exprTokens } = splitTitleAndExpression(tokens);

  const title = titleTokens.map((t) => t.value).join(" ");
  const amount = exprTokens.length > 0 ? evaluate(parseExpression(exprTokens)) : 0;

  return { title, amount, currencies: currenciesOf(exprTokens) };
}

function currenciesOf(tokens: Token[]): string[] {
  return [...new Set(tokens.flatMap((t) => (t.currency ? [t.currency] : [])))];
}

export { tokenize } from "./tokenizer";
export { parseExpression, splitTitleAndExpression } from "./parser";
export { evaluate } from "./evaluator";
export { createUnitRegistry, defaultUnits } from "./units";
export type { UnitRegistry } from "./units";
export { createBudgetCurrencyRegistry, createCurrencyRegistry } from "./currencies";
export type { CurrencyRegistry } from "./currencies";
export {
  ParseError,
  type ParsedResult,
  type Token,
  type TokenType,
  type AstNode,
  type Operator,
} from "./types";
