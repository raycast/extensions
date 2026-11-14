export function trimTagsAndDecodeEntities(value: string | undefined): string {
  if (!value) return "";

  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex: string) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return match;
      }
    })
    .replace(/&#([0-9]+);/g, (match, decimal: string) => {
      try {
        return String.fromCodePoint(parseInt(decimal, 10));
      } catch {
        return match;
      }
    })
    .replace(/&nbsp;/g, "\u00a0")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&hellip;/g, "\u2026")
    .replace(/&copy;/g, "\u00a9")
    .replace(/&amp;/g, "&");
}
