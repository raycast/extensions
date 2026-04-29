import { api } from "./client";
import { SearchResult, SearchResponseSchema } from "./schemas";

export interface SearchOptions {
  q: string;
  limit?: number;
  semantic?: boolean;
  semanticBoost?: number;
  rerank?: boolean;
  signal?: AbortSignal;
}

export async function search(opts: SearchOptions): Promise<SearchResult[]> {
  const data = await api.get<unknown>("/search", {
    query: {
      q: opts.q,
      limit: opts.limit,
      semantic: opts.semantic,
      semanticBoost: opts.semanticBoost,
      rerank: opts.rerank,
    },
    signal: opts.signal,
  });
  return SearchResponseSchema.parse(data).matches;
}
