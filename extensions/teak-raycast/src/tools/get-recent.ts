import { searchCards } from "../lib/api";

type Input = {
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
  /** When true, only include favorited cards. */
  favorited?: boolean;
  /** Only include cards created after this timestamp (milliseconds since epoch). */
  createdAfter?: number;
  /** Only include cards created before this timestamp (milliseconds since epoch). */
  createdBefore?: number;
  /** Maximum number of cards to return. Defaults to 10, max 50. */
  limit?: number;
};

/**
 * Fetch the most recent Teak cards (newest first). Use this when the user asks
 * for "recent", "latest", or "today's" saves without supplying a search query.
 */
export default async function tool(input: Input = {}) {
  const limit = Math.max(1, Math.min(input.limit ?? 10, 50));

  const result = await searchCards({
    createdAfter: input.createdAfter,
    createdBefore: input.createdBefore,
    favorited: input.favorited,
    limit,
    sort: "newest",
    type: input.type,
  });

  return result.items.map((card) => ({
    aiSummary: card.aiSummary,
    appUrl: card.appUrl,
    cardId: card.id,
    content: card.content,
    createdAt: card.createdAt,
    isFavorited: card.isFavorited,
    tags: card.tags,
    title: card.metadataTitle ?? (card.content.slice(0, 80) || "Untitled"),
    type: card.type,
    url: card.url,
  }));
}
