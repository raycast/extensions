import { searchCards } from "../lib/api";

type Input = {
  /** When true, limit results to favorited cards. */
  favorited?: boolean;
  /** Maximum number of cards to return. Defaults to 10. */
  limit?: number;
  /** Optional free-text query to search across Teak cards. */
  query?: string;
  /** Sort results by newest or oldest creation date. */
  sort?: "newest" | "oldest";
  /** Optional exact tag filter. */
  tag?: string;
  /** Optional card type filter. */
  type?:
    | "audio"
    | "document"
    | "image"
    | "link"
    | "palette"
    | "quote"
    | "text"
    | "video";
};

export default async function tool(input: Input = {}) {
  const result = await searchCards(
    {
      favorited: input.favorited,
      limit: input.limit ?? 10,
      query: input.query,
      sort: input.sort,
      tag: input.tag,
      type: input.type,
    },
    // AI tools run headless — never open the browser sign-in overlay.
    { interactive: false },
  );

  return result.items.map((card) => ({
    aiSummary: card.aiSummary,
    appUrl: card.appUrl,
    cardId: card.id,
    content: card.content,
    isFavorited: card.isFavorited,
    notes: card.notes,
    tags: card.tags,
    title: card.metadataTitle ?? (card.content.slice(0, 80) || "Untitled"),
    type: card.type,
    url: card.url,
  }));
}
