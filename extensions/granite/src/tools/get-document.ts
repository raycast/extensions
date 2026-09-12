import { getClient } from "../lib/preferences";
import type { DocumentDetail } from "../lib/types";

type Input = {
  /** The document id (uuid) from search-vault or list-documents. */
  id: string;
  /** When true, include the full OCR/body text. Default false to keep payloads small. */
  include_full_text?: boolean;
};

/**
 * Fetch one document by id with its full structured fields — title, type, dates,
 * extracted field values, linked entities and collections. Set include_full_text
 * to also return the raw OCR/body text.
 */
export default async function tool(input: Input) {
  return getClient().request<DocumentDetail>("GET", `/documents/${encodeURIComponent(input.id)}`, {
    query: input.include_full_text ? { include: "full_text" } : {},
  });
}
