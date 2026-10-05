import { CardType, Flashcard, Option } from "../types";

/**
 * Parse Markdown input into a flashcard.
 *
 * Standard-Karte:
 *   Frage
 *   ==
 *   Antwort
 *   #tag1 #tag2
 *
 * Multiple-Choice-Karte:
 *   Frage
 *   ==<
 *   1: Option A
 *   2: Option B
 *   3: Option C
 *   --
 *   correct: 2
 *   #tag1 #tag2
 *
 * Blank lines between sections are optional.
 * Tags are normalized to lowercase automatically.
 */
export function parseMarkdown(input: string): Omit<Flashcard, "id" | "progress" | "createdAt"> {
  const lines = input.trim().split("\n");

  // Extract tags from the last line when it contains only #tags.
  let tags: string[] = [];
  let contentLines = lines;

  const lastLine = lines[lines.length - 1]?.trim() ?? "";
  // Use a Unicode-aware regex so tags can contain accents and other characters.
  if (/^(#[\p{L}\p{N}_]+\s*)+$/u.test(lastLine)) {
    tags = (lastLine.match(/#([\p{L}\p{N}_]+)/gu) ?? []).map((t) => t.slice(1).toLowerCase());
    contentLines = lines.slice(0, -1);
  }

  const content = contentLines.join("\n").trim();

  // Detect the card type from the separator.
  if (/\n[\t ]*==</.test(content)) {
    return parseMC(content, tags);
  } else {
    return parseStandard(content, tags);
  }
}

function parseStandard(content: string, tags: string[]): Omit<Flashcard, "id" | "progress" | "createdAt"> {
  // Split on ==, allowing optional surrounding blank lines.
  const parts = content.split(/\n[\t ]*==[\t ]*\n/);
  const front = parts[0]?.trim() ?? "";
  const back = parts[1]?.trim() ?? "";

  return {
    type: "standard" as CardType,
    front,
    back,
    tags,
  };
}

function parseMC(content: string, tags: string[]): Omit<Flashcard, "id" | "progress" | "createdAt"> {
  // Split on ==<, allowing optional surrounding blank lines.
  const [frontPart, rest] = content.split(/\n[\t ]*==<[\t ]*\n/);
  const front = frontPart?.trim() ?? "";

  // Split the remainder on --, allowing optional surrounding blank lines.
  const [optionsPart, correctPart] = (rest ?? "").split(/\n[\t ]*--[\t ]*\n/);

  // Parse options such as "1: Text", "2: Text", and "3: Text".
  const options: Option[] = (optionsPart ?? "")
    .trim()
    .split("\n")
    .reduce<Option[]>((acc, line) => {
      const m = line.trim().match(/^(\d+):\s*(.+)/);
      if (m) {
        acc.push({ id: parseInt(m[1], 10), text: m[2].trim() });
      }
      return acc;
    }, []);

  // Parse the correct answer and accept legacy keywords for compatibility.
  const correctMatch = (correctPart ?? "")
    .trim()
    .match(/^(correct|true|richtig|correcto|正确|सही|правильно|صحيح|correto|corretto|doğru):\s*(\d+)/im);
  const correctOption = correctMatch ? parseInt(correctMatch[2], 10) : undefined;

  return {
    type: "multiple-choice" as CardType,
    front,
    options,
    correctOption,
    tags,
  };
}

/**
 * Parse a Markdown file containing multiple flashcards.
 *
 * Cards are separated by a line containing exactly "---".
 * The "-" placeholder (no tags) is removed before parsing.
 * Empty blocks are skipped.
 */
export function parseMultipleCards(input: string): Omit<Flashcard, "id" | "progress" | "createdAt">[] {
  // Split on --- separators only when --- occupies its own line.
  const blocks = input.split(/\n[ \t]*---[ \t]*\n/);

  const results: Omit<Flashcard, "id" | "progress" | "createdAt">[] = [];

  for (const raw of blocks) {
    // Clean up the block.
    let block = raw.trim();
    if (!block) continue;

    // Remove "-" as the last line, which represents no tags.
    const lines = block.split("\n");
    const lastLine = lines[lines.length - 1]?.trim() ?? "";
    if (lastLine === "-") {
      block = lines.slice(0, -1).join("\n").trim();
    }

    // Skip empty blocks after cleanup.
    if (!block) continue;

    results.push(...parseBlock(block));
  }

  return results;
}

function parseBlock(block: string): Omit<Flashcard, "id" | "progress" | "createdAt">[] {
  if (/\n[\t ]*==(?:<)?[\t ]*(?:\n|$)/.test(block)) {
    return [parseMarkdown(block)];
  }

  const lines = block.split("\n");
  const lastLine = lines[lines.length - 1]?.trim() ?? "";
  const tags = /^(#[\p{L}\p{N}_]+\s*)+$/u.test(lastLine)
    ? (lastLine.match(/#([\p{L}\p{N}_]+)/gu) ?? []).map((tag) => tag.slice(1).toLowerCase())
    : [];
  const contentLines = tags.length > 0 ? lines.slice(0, -1) : lines;
  const cards = contentLines.flatMap((line) => {
    const match = line.trim().match(/^-\s+\*\*(.+?)\*\*\s+[—–-]\s+(.+?)\s*$/);

    return match
      ? [
          {
            type: "standard" as CardType,
            front: match[1].trim(),
            back: match[2].trim(),
            tags,
          },
        ]
      : [];
  });

  return cards;
}
