import { searchCards } from "../lib/api";
import { toToolSearch } from "../lib/toolSearch";

type Input = {
  /** When true, list archived cards only; archived cards are left out by default. */
  archived?: boolean;
  /** Only include cards created after this timestamp (milliseconds since epoch). */
  createdAfter?: number;
  /** Only include cards created before this timestamp (milliseconds since epoch). */
  createdBefore?: number;
  /** "done" lists links marked read, watched, bought or done; "todo" lists articles, books, films, shows, podcasts, music, products, recipes, courses, events, apps and games not yet done. */
  done?: "done" | "todo";
  /** When true, limit results to favorited cards. */
  favorited?: boolean;
  /** Only cards in this folder: its name, or its id from list-folders. A smart folder lists the cards its search finds. */
  folder?: string;
  /** Maximum number of cards to return. Defaults to 10, max 50. */
  limit?: number;
  /** Find images by mood, such as "moody brutalist". */
  mood?: string;
  /** Optional free-text query to search across Teak cards. */
  query?: string;
  /** A card id: only the cards closest to it in meaning, never the card itself. */
  similarTo?: string;
  /** Sort by newest or oldest creation date, or shuffle for a random sample. With similarTo and no sort, the closest cards come first. */
  sort?: "newest" | "oldest" | "shuffle";
  /** Optional exact tag filter. Use "secret" or "hidden" to include hidden cards. */
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
    toToolSearch(input, Math.max(1, Math.min(input.limit ?? 10, 50))),
    "silent",
  );

  return result.items.map((card) => ({
    aiSummary: card.aiSummary,
    appUrl: card.appUrl,
    cardId: card.id,
    content: card.content,
    isArchived: Boolean(card.isArchived),
    isDone: typeof card.completedAt === "number",
    isFavorited: card.isFavorited,
    notes: card.notes,
    tags: card.tags,
    title: card.metadataTitle ?? (card.content.slice(0, 80) || "Untitled"),
    type: card.type,
    url: card.url,
  }));
}
