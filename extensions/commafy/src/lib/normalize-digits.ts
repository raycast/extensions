/**
 * Convert full-width (全角) numeric characters in the U+FF0B–U+FF19 range
 * (`＋ ， － ． ／ ０ - ９`) to their half-width ASCII counterparts. Also
 * handles the standalone U+2212 MINUS SIGN.
 *
 * Useful in Japanese contexts where IME input occasionally produces full-width
 * numerics that downstream tools (commafy, calculators, spreadsheets) don't
 * recognize as numbers. Without normalizing punctuation, expressions like
 * `１２３４．５６` would lose their decimal sense after a commafy pass.
 */

export type NormalizeDigitsResult = {
  text: string;
  count: number;
};

const FULLWIDTH_OFFSET = 0xfee0;

export function normalizeDigits(text: string): NormalizeDigitsResult {
  let count = 0;
  const out = text.replace(/[＋-９−]/g, (c) => {
    count += 1;
    if (c === "−") return "-"; // MINUS SIGN
    return String.fromCharCode(c.charCodeAt(0) - FULLWIDTH_OFFSET);
  });
  return { text: out, count };
}
