/**
 * Replace common Pandas names with shorter aliases in a string.
 * @param text The text to process
 * @returns The text with aliases applied
 */
export function replacePrefix(text: string): string {
  return (
    text
      .replace(/\bpandas\./g, "pd.")
      // Render object method signatures using instance-style aliases.
      .replace(/\bpd\.DataFrame\.([A-Za-z_]\w*)\b/g, "df.$1")
      .replace(/\bpd\.Series\.([A-Za-z_]\w*)\b/g, "s.$1")
      // Only alias standalone words, not dotted API references such as pd.DataFrame or pd.Array.
      .replace(/(?<!\.)\bdataframes?\b/gi, "df")
      .replace(/(?<!\.)\bseries\b/gi, "s")
      .replace(/(?<!\.)\barrays?\b/gi, "arr")
  );
}

/**
 * Apply aliases to text based on user preference.
 * @param text The text to process
 * @param useShortPrefix Whether to use aliases such as pd/df/s/arr
 * @returns The text with aliases applied if useShortPrefix is true
 */
export function applyPrefixPreference(text: string, useShortPrefix: boolean): string {
  if (!useShortPrefix) {
    return text;
  }
  return replacePrefix(text);
}
