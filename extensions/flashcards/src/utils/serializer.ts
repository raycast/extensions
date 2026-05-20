import { Flashcard } from "../types";

/**
 * Konvertiert eine einzelne Karteikarte ins Markdown-Format.
 *
 * Standard:   Frage\n==\nAntwort\n#tags | -
 * MC:         Frage\n==<\n1: Opt\n…\n--\ncorrect: N\n#tags | -
 */
function cardToMarkdown(card: Flashcard): string {
  const lines: string[] = [];

  // Frage / Vorderseite
  lines.push(card.front);

  if (card.type === "multiple-choice") {
    // MC-Trenner
    lines.push("==<");

    // Optionen
    for (const opt of card.options ?? []) {
      lines.push(`${opt.id}: ${opt.text}`);
    }

    // Trenner zur korrekten Antwort
    lines.push("--");

    // Korrekte Antwort - standardmäßig immer englisch "correct" für robuste Round-Trips
    if (card.correctOption !== undefined) {
      lines.push(`correct: ${card.correctOption}`);
    }
  } else {
    // Standard-Trenner
    lines.push("==");

    // Antwort / Rückseite
    lines.push(card.back ?? "");
  }

  // Tags oder Platzhalter
  if (card.tags.length > 0) {
    lines.push(card.tags.map((t) => `#${t}`).join(" "));
  } else {
    lines.push("-");
  }

  return lines.join("\n");
}

/**
 * Serialisiert ein Array von Karteikarten ins Markdown-Format.
 * Karten werden durch "---" getrennt.
 */
export function cardsToMarkdown(cards: Flashcard[]): string {
  return cards.map((c) => cardToMarkdown(c)).join("\n---\n");
}
