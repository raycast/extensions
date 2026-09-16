export type Lang = "it" | "en";

const MLANG_RE = /\{mlang\s+([a-z_]+)\}([\s\S]*?)\{mlang\}/gi;

/**
 * Resolves Moodle multi-language filter tags (`{mlang it}...{mlang}{mlang en}...{mlang}`)
 * to a single variant. Falls back to English, then Italian, then the first variant found.
 * Text outside the tags is preserved.
 */
export function resolveMlang(text: string, lang: Lang): string {
  if (!text || !/\{mlang/i.test(text)) return text;

  const variants = new Map<string, string>();
  let first: string | undefined;
  for (const match of text.matchAll(MLANG_RE)) {
    const code = match[1].toLowerCase();
    if (!variants.has(code)) variants.set(code, match[2]);
    if (first === undefined) first = match[2];
  }
  if (variants.size === 0) return text;

  const chosen = variants.get(lang) ?? variants.get("en") ?? variants.get("it") ?? first ?? "";
  let replaced = false;
  return text
    .replace(MLANG_RE, () => {
      if (replaced) return "";
      replaced = true;
      return chosen;
    })
    .replace(/\s{2,}/g, " ")
    .trim();
}
