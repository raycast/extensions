import { Action, Tool } from "@raycast/api";
import { createCardsFromMarkdown } from "../utils/ai-flashcards";
import { parseMultipleCards } from "../utils/parser";
import { cardsToMarkdown } from "../utils/serializer";

export type GenerateInput = {
  markdown: string;
  tags?: string;
};

export type GenerateResult = {
  cards: string;
  skipped: number;
  error?: string;
};

export const confirmation: Tool.Confirmation<GenerateInput> = async ({ markdown }) => {
  const cardCount = parseMultipleCards(markdown).length;

  if (cardCount === 0) {
    return undefined;
  }

  return {
    style: Action.Style.Regular,
    message: "Save generated flashcards to your local collection?",
    info: [{ name: "Cards", value: String(cardCount) }],
  };
};

export default async function generateFlashcards(input: GenerateInput): Promise<GenerateResult> {
  if (!input?.markdown?.trim()) {
    return {
      cards: "",
      skipped: 0,
      error: "Provide Markdown content containing at least one flashcard.",
    };
  }

  const tags = (input.tags ?? "")
    .split(",")
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean);
  const markdown = input.markdown.trim();
  const existingTags = /^(#[\p{L}\p{N}_]+\s*)+$/u.test(
    markdown.split("\n")[markdown.split("\n").length - 1]?.trim() ?? "",
  );
  const taggedMarkdown =
    tags.length > 0
      ? `${existingTags ? markdown.split("\n").slice(0, -1).join("\n") : markdown}\n${tags.map((tag) => `#${tag}`).join(" ")}`
      : markdown;
  const result = await createCardsFromMarkdown(taggedMarkdown);
  if (result.cards.length === 0) {
    return {
      cards: "",
      skipped: 1,
      error:
        "No flashcards were created. Convert the request into Markdown cards using 'Question\\n==\\nAnswer' and separate cards with '---'.",
    };
  }

  return {
    cards: cardsToMarkdown(result.cards),
    skipped: result.skipped,
  };
}
