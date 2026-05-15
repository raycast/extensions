/** Inserts U+200B so no run of three backticks survives (avoids breaking an outer fenced code block). */
export function sanitizeMarkdownFenceContent(value: string): string {
  let result = value;
  while (result.includes("```")) {
    result = result.replace("```", "``\u200b`");
  }
  return result;
}
