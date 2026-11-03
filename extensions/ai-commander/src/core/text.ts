/**
 * Replaces lone surrogates, which damaged input can contain. They are not valid in XML, and `encodeURIComponent`
 * throws on them. With the `u` flag this class leaves proper surrogate pairs alone.
 */
export function wellFormed(text: string): string {
  return text.replace(/[\uD800-\uDFFF]/gu, "�");
}
