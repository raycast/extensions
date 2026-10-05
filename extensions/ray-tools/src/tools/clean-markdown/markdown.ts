function longestBacktickRun(text: string): number {
  let longest = 0;
  let current = 0;

  for (const character of text) {
    if (character === "`") {
      current += 1;
      continue;
    }

    longest = Math.max(longest, current);
    current = 0;
  }

  return Math.max(longest, current);
}

function asMarkdownCodeBlock(text: string): string {
  const fence = "`".repeat(Math.max(3, longestBacktickRun(text) + 1));
  return `${fence}\n${text}\n${fence}`;
}

export function formatResult(cleanedText: string, sourceText: string): string {
  return [
    "## Очищенный текст",
    "",
    asMarkdownCodeBlock(cleanedText),
    "",
    "### Было",
    "",
    asMarkdownCodeBlock(sourceText),
  ].join("\n");
}
