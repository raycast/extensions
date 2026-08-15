import { getClient } from "../lib/preferences";
import type { DocumentsResponse } from "../lib/types";

type Input = {
  /** Opaque pagination cursor from a prior response's `next_cursor`. Omit for the first page. */
  cursor?: string;
  /** Page size (default 50, max 100). */
  limit?: number;
  /** Restrict to one vault, by its slug or id (from a document's `vault` field). Omit to list every vault. */
  vault?: string;
};

/**
 * List documents in the vault, oldest first, as metadata. Cursor-paginated:
 * pass the response's next_cursor back as `cursor` to get the next page.
 */
export default async function tool(input: Input) {
  return getClient().request<DocumentsResponse>("GET", "/documents", {
    query: { cursor: input.cursor, limit: input.limit, vault: input.vault },
  });
}
