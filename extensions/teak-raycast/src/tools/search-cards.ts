import { searchCards } from "../lib/api";

type Input = {
  /** Optional free-text query to search across Teak cards. */
  query?: string;
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
  /** Optional exact tag filter. */
  tag?: string;
  /** When true, limit results to favorited cards. */
  favorited?: boolean;
  /** Sort results by newest or oldest creation date. */
  sort?: "newest" | "oldest";
  /** Maximum number of cards to return. Defaults to 10. */
  limit?: number;
};

export default async function tool(input: Input = {}) {
  const result = await searchCards({
    favorited: input.favorited,
    limit: input.limit ?? 10,
    query: input.query,
    sort: input.sort,
    tag: input.tag,
    type: input.type,
  });

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
