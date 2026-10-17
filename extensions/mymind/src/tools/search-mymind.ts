import { listObjects, searchObjects } from "../api";
import { matchesTypeFilter } from "../object-kind";
import { TypeFilter } from "../object-query";
import { ObjectSummary, summarizeObject } from "./shared";

type Input = {
  /**
   * The natural-language search query. Leave empty to return the most recent
   * items from the library.
   */
  query?: string;
  /**
   * Filter results to a single kind of item. Use "all" (the default) to include
   * every type. "article" covers saved links and web pages.
   */
  type?: TypeFilter;
  /**
   * Maximum number of results to return. Defaults to 25.
   */
  limit?: number;
};

/**
 * Search the user's mymind library and return concise, structured results.
 * Use this to find saved links, notes, images, videos, PDFs, and other items by
 * topic or keyword before acting on them with other tools.
 */
export default async function tool(input: Input): Promise<ObjectSummary[]> {
  const query = input.query?.trim();
  const type: TypeFilter = input.type ?? "all";
  const limit = input.limit && input.limit > 0 ? input.limit : 25;

  const objects = query ? await searchObjects({ q: query, limit: 200 }) : await listObjects({ limit: 200 });

  return objects
    .filter((item) => !item.deleted && matchesTypeFilter(item, type))
    .slice(0, limit)
    .map((item) => summarizeObject(item));
}
