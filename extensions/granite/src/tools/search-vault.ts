import { getClient } from "../lib/preferences";
import type { SearchResponse } from "../lib/types";

type Input = {
  /** Search query, natural-language or keyword, e.g. "2024 W-2" or "home insurance policy". */
  query: string;
  /** Search mode. Default "hybrid" (recommended). "keyword" = exact term/number match; "semantic" = meaning-based. */
  mode?: "hybrid" | "keyword" | "semantic";
  /** Restrict to one vault, by its slug or id (from a document's `vault` field). Omit to search every vault. */
  vault?: string;
};

/**
 * Search the Granite document vault and return ranked matches (metadata + a short
 * snippet). Use this to FIND documents; then call get-document for full fields.
 */
export default async function tool(input: Input) {
  return getClient().request<SearchResponse>("GET", "/search", {
    query: { q: input.query, mode: input.mode, vault: input.vault },
  });
}
