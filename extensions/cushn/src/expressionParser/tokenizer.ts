import { type CurrencyRegistry } from "./currencies";
import { ParseError, type Token } from "./types";
import { defaultUnits, type UnitRegistry } from "./units";

const OPERATOR_CHARS = new Set(["+", "-", "*", "/"]);

const isDigit = (ch: string) => ch >= "0" && ch <= "9";

// Characters allowed inside a WORD token. Accepts letters from any script
// (\p{L}), underscore/hyphen, and emoji code points along with the joiners
// (U+200D ZWJ, U+FE0F VS-16) and skin-tone modifiers that compose multi-
// codepoint sequences like 👨‍👩‍👧‍👦 or 👍🏽.
const WORD_CHAR_REGEX =
  /^([\p{L}_\-‍️]|\p{Extended_Pictographic}|\p{Emoji_Modifier})$/u;
const isWordChar = (ch: string) => WORD_CHAR_REGEX.test(ch);

const cpSize = (cp: number) => (cp > 0xffff ? 2 : 1);

const isHSpace = (ch: string | undefined) => ch === " " || ch === "\t";

export interface TokenizeOptions {
  units?: UnitRegistry;
  currencies?: CurrencyRegistry;
}

/**
 * Splits the input into a flat token stream. Whitespace is skipped.
 * A NUMBER token's `numericValue` already accounts for any unit suffix
 * (e.g. "1.5k" → 1500) and any currency annotation (e.g. "200 eur" with
 * eur=1.17 → 234), so downstream stages don't re-parse the literal.
 *
 * Currency conventions:
 *   - Single-codepoint currency symbols ($, €, ₸…) may appear before or
 *     after the number, with or without whitespace ("$200", "$ 200", "200₸").
 *   - Multi-character currency words (eur, usd, kzt) may only appear *after*
 *     the number ("200 eur", "200eur") — placing them before would clash
 *     with title parsing.
 *   - A currency the registry resolves but has no rate for throws
 *     `No exchange rate for EUR`.
 */
export function tokenize(input: string, options: TokenizeOptions = {}): Token[] {
  const units = options.units ?? defaultUnits;
  const currencies = options.currencies;
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const cp = input.codePointAt(i)!;
    const ch = String.fromCodePoint(cp);
    const size = cpSize(cp);

    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i += size;
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "LPAREN", value: ch, position: i });
      i += size;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "RPAREN", value: ch, position: i });
      i += size;
      continue;
    }

    if (OPERATOR_CHARS.has(ch)) {
      tokens.push({ type: "OPERATOR", value: ch, position: i });
      i += size;
      continue;
    }

    // Currency symbol BEFORE a number: "$200", "$ 200", "€10".
    // Restricted to non-word-char codepoints so multi-letter codes like
    // "eur" don't get pulled out of the title.
    const symbolCode = currencies && !isWordChar(ch) ? currencies.resolve(ch) : undefined;
    if (currencies && symbolCode) {
      const start = i;
      let lookI = i + size;
      while (isHSpace(input[lookI])) lookI++;
      if (
        lookI < input.length &&
        (isDigit(input[lookI]) ||
          (input[lookI] === "." && isDigit(input[lookI + 1] ?? "")))
      ) {
        const rate = rateOf(currencies, symbolCode, start);
        const literal = readDigitLiteral(input, lookI);
        const base = Number(literal);
        if (Number.isNaN(base)) {
          throw new ParseError(`Invalid number literal "${literal}"`, lookI);
        }
        let numericValue = base * rate;
        let consumedTo = lookI + literal.length;
        if (consumedTo < input.length) {
          const uCp = input.codePointAt(consumedTo)!;
          const uSuffix = String.fromCodePoint(uCp);
          if (units.has(uSuffix)) {
            numericValue *= units.get(uSuffix) as number;
            consumedTo += cpSize(uCp);
          }
        }
        tokens.push({
          type: "NUMBER",
          value: input.slice(start, consumedTo),
          numericValue,
          currency: symbolCode,
          position: start,
        });
        i = consumedTo;
        continue;
      }
      throw new ParseError(
        `Currency symbol "${ch}" must be adjacent to a number`,
        i,
      );
    }

    if (isDigit(ch) || (ch === "." && isDigit(input[i + 1] ?? ""))) {
      const start = i;
      const literal = readDigitLiteral(input, i);
      i += literal.length;

      const base = Number(literal);
      if (Number.isNaN(base)) {
        throw new ParseError(`Invalid number literal "${literal}"`, start);
      }

      // Optional single-code-point unit suffix immediately following the
      // digits. The registry decides what's valid, so any script (k, к, …)
      // works as long as it's been registered. A glued currency word wins
      // over a unit letter: "200kzt" is 200 KZT, "5баксов" is 5 USD.
      let numericValue = base;
      if (i < input.length) {
        const sufCp = input.codePointAt(i)!;
        const suffix = String.fromCodePoint(sufCp);
        if (units.has(suffix) && !currencies?.resolve(input.slice(i, wordEnd(input, i)))) {
          numericValue = base * (units.get(suffix) as number);
          i += cpSize(sufCp);
        }
      }

      // Optional trailing currency: glued symbol ("200₸"), glued word
      // ("200eur"), or whitespace-separated ("200 eur", "20k usd").
      let currency: string | undefined;
      if (currencies) {
        const match = matchTrailingCurrency(input, i, currencies);
        if (match) {
          numericValue *= rateOf(currencies, match.code, match.position);
          currency = match.code;
          i = match.nextI;
        }
      }

      tokens.push({
        type: "NUMBER",
        value: input.slice(start, i),
        numericValue,
        currency,
        position: start,
      });
      continue;
    }

    if (isWordChar(ch)) {
      const start = i;
      const end = wordEnd(input, i);
      tokens.push({ type: "WORD", value: input.slice(start, end), position: start });
      i = end;
      continue;
    }

    throw new ParseError(`Unexpected character "${ch}"`, i);
  }

  return tokens;
}

function readDigitLiteral(input: string, start: number): string {
  let i = start;
  let hasDot = input[i] === ".";
  i++;
  while (i < input.length) {
    const c = input[i];
    if (isDigit(c)) {
      i++;
    } else if (c === "." && !hasDot) {
      hasDot = true;
      i++;
    } else {
      break;
    }
  }
  return input.slice(start, i);
}

function wordEnd(input: string, start: number): number {
  let end = start;
  while (end < input.length) {
    const cp = input.codePointAt(end)!;
    if (!isWordChar(String.fromCodePoint(cp))) break;
    end += cpSize(cp);
  }
  return end;
}

function rateOf(currencies: CurrencyRegistry, code: string, position: number): number {
  const rate = currencies.rate(code);
  if (rate === undefined) {
    throw new ParseError(`No exchange rate for ${code.toUpperCase()}`, position);
  }
  return rate;
}

function matchTrailingCurrency(
  input: string,
  fromI: number,
  currencies: CurrencyRegistry,
): { code: string; position: number; nextI: number } | null {
  let i = fromI;
  while (isHSpace(input[i])) i++;
  if (i >= input.length) return null;

  const cp = input.codePointAt(i)!;
  const end = isWordChar(String.fromCodePoint(cp)) ? wordEnd(input, i) : i + cpSize(cp);
  const code = currencies.resolve(input.slice(i, end));
  return code ? { code, position: i, nextI: end } : null;
}
