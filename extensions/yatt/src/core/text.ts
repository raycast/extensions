/** Case- and diacritic-insensitive key for matching place names and aliases. */
export function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/đ/g, "d")
    .replace(/ł/g, "l")
    .replace(/[’'`´]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const LATIN = /^[\p{Script=Latin}\p{M}\d\s'’.,()/-]+$/u;

/** True for names written in the Latin script (used to keep alternate names searchable from a Latin keyboard). */
export function isLatin(s: string): boolean {
  return LATIN.test(s);
}
