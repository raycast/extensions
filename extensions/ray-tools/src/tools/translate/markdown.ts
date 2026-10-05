import type { TranslationResult } from "./types";

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

export function asMarkdownCodeBlock(text: string): string {
  const fence = "`".repeat(Math.max(3, longestBacktickRun(text) + 1));
  return `${fence}\n${text}\n${fence}`;
}

export function formatResult(
  result: TranslationResult,
  sourceText: string,
): string {
  const direction = `${result.sourceLanguage.toUpperCase()} → ${result.targetLanguage.toUpperCase()}`;

  return [
    `## ${direction}`,
    "",
    asMarkdownCodeBlock(result.text),
    "",
    "---",
    "",
    "**Source**",
    "",
    asMarkdownCodeBlock(sourceText),
  ].join("\n");
}
