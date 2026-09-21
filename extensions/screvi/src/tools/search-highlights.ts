import { endpoint, get, Paginated, SearchResult } from "../lib/screvi";

type Input = {
  /**
   * What to look for. Screvi searches by meaning as well as by keyword, so a
   * description of the idea ("why deadlines expand to fill the time") works as
   * well as an exact phrase.
   */
  query: string;
  /** Restrict to highlights from sources whose name or author matches this. */
  source?: string;
  /** Restrict to highlights carrying this tag, exactly as the tag is named. */
  tag?: string;
  /** Restrict to favourited highlights only. */
  favorite?: boolean;
  /** How many to return. Defaults to 15, at most 50. */
  limit?: number;
};

/**
 * Search the user's own saved highlights — the passages they marked while
 * reading books, articles, newsletters and podcasts.
 */
export default async function searchHighlights(input: Input) {
  const { data } = await get<Paginated<SearchResult>>(
    endpoint("/search", {
      q: input.query,
      source: input.source,
      tag: input.tag,
      favorite: input.favorite,
      per_page: Math.min(input.limit ?? 15, 50),
    }),
  );

  return data.map((highlight) => ({
    content: highlight.content,
    note: highlight.note,
    source: highlight.source?.name,
    author: highlight.source?.author,
    type: highlight.source?.type,
    tags: highlight.tags.map((tag) => tag.name),
    favorite: highlight.favorite,
    matchedBy: highlight.match_type,
    url: `https://app.screvi.com/highlights/${highlight.id}`,
  }));
}
