import { getSearchResults } from "../utils/ai-flashcards";
import { cardsToMarkdown } from "../utils/serializer";

export type SearchInput = {
  query: string;
  tag?: string;
};

export type SearchResult = {
  count: number;
  cards: string;
  error?: string;
};

export default async function searchFlashcards(input: SearchInput): Promise<SearchResult> {
  const query = input?.query?.trim() ?? "";
  if (!query) {
    return {
      count: 0,
      cards: "",
      error: "Provide a search query.",
    };
  }

  const cards = await getSearchResults(query, input.tag);
  return { count: cards.length, cards: cardsToMarkdown(cards) };
}
