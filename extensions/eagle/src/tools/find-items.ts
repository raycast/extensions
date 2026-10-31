import { findItems } from "../utils/ai-search";

type Input = {
  /** Exact Eagle item ID. Use alone, without search or filters. */
  itemId?: string;
  /** Full-text query across names, tags, notes, URLs and folders. Supports AND, OR and -exclusions. Use without filters. */
  query?: string;
  /** Filter by existing tag names, without query. */
  tags?: string[];
  /** Filter by existing folder IDs from get-library, without query. */
  folderIds?: string[];
  /** Filter by extension without a dot, such as png, without query. */
  extension?: string;
  /** Filter by the item's source HTTP(S) URL, without query. */
  sourceUrl?: string;
  /** Filter by an integer rating from 0 to 5, without query. */
  rating?: number;
  /** Number of results to skip. Start at 0 and use nextOffset to continue. */
  offset?: number;
  /** Page size from 1 to 100. Defaults to 50. */
  limit?: number;
};

/** Find Eagle items with complete metadata and eagle:// links. Choose exactly one mode: itemId alone, query without filters, or structured filters without query. Search before importing to check duplicates. */
export default async function tool(input: Input) {
  return findItems(input);
}
