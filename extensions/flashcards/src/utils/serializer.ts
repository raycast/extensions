import { Flashcard } from "../types";

/**
 * Convert one flashcard to Markdown.
 *
 * Standard:   Question\n==\nAnswer\n#tags | -
 * MC:         Question\n==<\n1: Option\n…\n--\ncorrect: N\n#tags | -
 */
export function cardToMarkdown(card: Flashcard): string {
  const lines: string[] = [];

  // Question / front side.
  lines.push(card.front);

  if (card.type === "multiple-choice") {
    // Multiple-choice separator.
    lines.push("==<");

    // Options.
    for (const opt of card.options ?? []) {
      lines.push(`${opt.id}: ${opt.text}`);
    }

    // Separator for the correct answer.
    lines.push("--");

    // Use the English "correct" keyword for reliable round trips.
    if (card.correctOption !== undefined) {
      lines.push(`correct: ${card.correctOption}`);
    }
  } else {
    // Standard separator.
    lines.push("==");

    // Answer / back side.
    lines.push(card.back ?? "");
  }

  // Tags or placeholder.
  if (card.tags.length > 0) {
    lines.push(card.tags.map((t) => `#${t}`).join(" "));
  } else {
    lines.push("-");
  }

  return lines.join("\n");
}

/**
 * Serialize an array of flashcards to Markdown.
 * Cards are separated by "---".
 */
export function cardsToMarkdown(cards: Flashcard[]): string {
  return cards.map((c) => cardToMarkdown(c)).join("\n---\n");
}
