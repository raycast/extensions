import { DEFAULT_SEARCH_LIMIT, searchKnowledge, type EmbeddingFunction } from "../lib/knowledge";
import { createClient } from "../lib/raycast";

type Input = {
  /** A natural-language description of the information to find in the user's explicitly indexed notes. */
  query: string;
  /** Maximum number of excerpts to return, from 1 through 8. Defaults to 8. */
  limit?: number;
};

/** Semantically search the user's opt-in local note index and return excerpts with their source paths. */
export default async function searchLocalNotes(input: Input) {
  const query = input.query.trim();
  if (!query) throw new Error("Provide a non-empty note search query.");
  const requestedLimit = Number.isFinite(input.limit)
    ? Math.floor(input.limit ?? DEFAULT_SEARCH_LIMIT)
    : DEFAULT_SEARCH_LIMIT;
  const limit = Math.max(1, Math.min(DEFAULT_SEARCH_LIMIT, requestedLimit));
  const client = createClient();
  const embed: EmbeddingFunction = async (texts, model, signal) => {
    const response = await client.embeddings({ model, input: texts, signal });
    return [...response.data].sort((left, right) => left.index - right.index).map((item) => item.embedding);
  };

  const results = await searchKnowledge(query, { limit, embed });
  return results.map((result) => {
    const sources = result.sources.slice(0, 8);
    return {
      path: result.path,
      startLine: result.startLine,
      endLine: result.endLine,
      excerpt: result.excerpt,
      score: result.score,
      sources,
      additionalSourceCount: result.sources.length - sources.length,
    };
  });
}
