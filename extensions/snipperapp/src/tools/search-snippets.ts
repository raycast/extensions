import { searchSnippets } from "../lib/snipper-helper";

type Input = {
  /** Text to match against snippet titles and content. */
  query?: string;
  /** Filter by language id (e.g. "swift", "typescript"). */
  language?: string;
  /** Only return favorite snippets. */
  favorite?: boolean;
  /** Maximum number of results (default 20, max 100). */
  limit?: number;
};

export default async function tool(input: Input) {
  const snippets = await searchSnippets({
    query: input.query,
    language: input.language,
    favorite: input.favorite,
    limit: input.limit ?? 20,
  });
  return snippets.map((snippet) => ({
    id: snippet.id,
    title: snippet.title,
    language: snippet.language,
    isFavorite: snippet.isFavorite,
    preview: snippet.content.slice(0, 200),
  }));
}
