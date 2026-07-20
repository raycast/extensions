/**
 * Replace common Polars names with shorter aliases in a string.
 */
export function replacePrefix(text: string): string {
  return (
    text
      .replace(/\bpolars\./g, "pl.")
      // Render object method signatures using instance-style aliases.
      .replace(/\bpl\.DataFrame\.([A-Za-z_]\w*)\b/g, "df.$1")
      .replace(/\bpl\.Series\.([A-Za-z_]\w*)\b/g, "s.$1")
      .replace(/\bpl\.LazyFrame\.([A-Za-z_]\w*)\b/g, "lf.$1")
      .replace(/\bpl\.LazyDataFrame\.([A-Za-z_]\w*)\b/g, "lf.$1")
      // Only alias standalone words, not dotted API references such as pl.DataFrame.
      .replace(/(?<!\.)\blazy(?:\s+)?dataframes?\b/gi, "lf")
      .replace(/(?<!\.)\blazyframes?\b/gi, "lf")
      .replace(/(?<!\.)\bdataframes?\b/gi, "df")
      .replace(/(?<!\.)\bseries\b/gi, "s")
  );
}

/**
 * Apply aliases to text based on user preference.
 */
export function applyPrefixPreference(text: string, useShortPrefix: boolean): string {
  if (!useShortPrefix) {
    return text;
  }
  return replacePrefix(text);
}
