/** A query's words: its runs of letters and digits in any script, lowercased, each once. */
export function queryWords(query: string): string[] {
  const words = query.normalize("NFC").match(/[\p{L}\p{N}]+/gu) ?? [];
  return [...new Set(words.map((word) => word.toLowerCase()))];
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
