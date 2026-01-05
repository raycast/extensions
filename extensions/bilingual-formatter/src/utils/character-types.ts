import { ZH_CHARS_START, ZH_CHARS_END } from "./constants";

export function isZhChar(c: string): boolean {
  return c >= ZH_CHARS_START && c <= ZH_CHARS_END;
}

export function isEnLetter(c: string): boolean {
  return (c >= "A" && c <= "Z") || (c >= "a" && c <= "z");
}

export function isDigit(c: string): boolean {
  return c >= "0" && c <= "9";
}

export function isEnPunctuation(c: string): boolean {
  return "([{@#$,.?!:;)]}%".includes(c);
}

export function isZhPunctuation(c: string): boolean {
  return "（【《￥，。？！：；）】》·～…".includes(c) || isZhQuote(c);
}

export function isZhQuote(c: string): boolean {
  return ('「『』」"' + "'" + "`" + "'").includes(c);
}

export function isZhCharOrPunctuation(c: string): boolean {
  return isZhChar(c) || isZhPunctuation(c) || isZhQuote(c);
}

export function isEnChar(c: string): boolean {
  return isEnLetter(c) || isEnPunctuation(c) || isDigit(c);
}

export function isLetter(c: string): boolean {
  return isZhChar(c) || isEnLetter(c);
}

export function isPunctuation(c: string): boolean {
  return isZhPunctuation(c) || isEnPunctuation(c);
}

export function isWhitespace(c: string): boolean {
  return c === " " || c === "\t" || c === "\n" || c === "\r";
}
