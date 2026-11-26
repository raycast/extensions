export type TokenType = "WORD" | "NUMBER" | "OPERATOR" | "LPAREN" | "RPAREN";

export type Operator = "+" | "-" | "*" | "/";

export interface Token {
  type: TokenType;
  value: string;
  /** Resolved numeric value for NUMBER tokens (after unit expansion). */
  numericValue?: number;
  /** Lowercase ISO code of the currency written on a NUMBER token, if any. */
  currency?: string;
  /** Position in the source string — useful for error reporting. */
  position: number;
}

export type AstNode =
  | { kind: "number"; value: number }
  | { kind: "binary"; op: Operator; left: AstNode; right: AstNode };

export interface ParsedResult {
  title: string;
  amount: number;
  /** Lowercase ISO codes written in the input, unique, in first-seen order. */
  currencies: string[];
}

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly position?: number,
  ) {
    super(message);
    this.name = "ParseError";
  }
}
