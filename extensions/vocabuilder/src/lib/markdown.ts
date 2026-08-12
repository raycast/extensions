import { Translation } from "./types";

function escapeMarkdown(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/[\\`*_{}[\]()#+.!|>~-]/g, "\\$&")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeMarkdownMultiline(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => escapeMarkdown(line))
    .join("  \n");
}

export function buildTranslationDetailMarkdown(
  translation: Pick<Translation, "word" | "translation" | "partOfSpeech" | "example" | "exampleTranslation">,
  originalInput?: string,
): string {
  const correctionNote =
    originalInput && originalInput !== translation.word
      ? `\n> *Corrected from "${escapeMarkdown(originalInput)}"*\n`
      : "";
  return `## ${escapeMarkdown(translation.word)}
${correctionNote}

**${escapeMarkdown(translation.translation)}** *(${escapeMarkdown(translation.partOfSpeech)})*

---

**Example:**

${escapeMarkdownMultiline(translation.example)}

*${escapeMarkdownMultiline(translation.exampleTranslation)}*`;
}

export function buildTextTranslationDetailMarkdown(input: string, translation: string): string {
  return `## Translation

${escapeMarkdownMultiline(translation)}

---

## Original

${escapeMarkdownMultiline(input)}`;
}

export function buildFlashcardDetailMarkdown(
  card: Pick<Translation, "word" | "translation" | "partOfSpeech" | "example" | "exampleTranslation">,
): string {
  return `## ${escapeMarkdown(card.word)}

**${escapeMarkdown(card.partOfSpeech)}** · ${escapeMarkdown(card.translation)}

---

${escapeMarkdownMultiline(card.example)}

${escapeMarkdownMultiline(card.exampleTranslation)}`;
}
