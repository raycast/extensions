import { search, type Filters } from "../lib/fsearch";
import { modifiedDate } from "../lib/format";
import { filtersFor } from "../lib/kinds";

type Input = {
  /** Name to fuzzy-match. Supports 'exact, ^prefix, suffix$, !exclude and file filters. Omit when filtering only. */
  query?: string;
  /** Folder to search within, as an absolute path or ~/ path. Spaces are supported. */
  folder?: string;
  /** Category to search, matching the Search Files command's kind menu. Defaults to all. */
  kind?: "all" | "file" | "folder" | "app" | "image" | "doc" | "code" | "video" | "audio" | "archive" | "font";
  /** Comma-separated file extensions without dots, such as pdf or ts,tsx. */
  extension?: string;
  /** Size comparison, such as >5mb or <100kb. */
  size?: string;
  /** Modification age, such as <7d for the last seven days or <2h for the last two hours. */
  modified?: string;
  /** Maximum results, from 1 to 100. Defaults to 30. */
  limit?: number;
};

/** Find files and folders by name or metadata. Returns paths, kinds, byte sizes and modification dates, without reading file contents. */
export default async function tool(input: Input) {
  const limit = input.limit ?? 30;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("limit must be an integer from 1 to 100");
  }

  const filters: Filters = { ...filtersFor(input.kind ?? "all") };
  if (input.folder) filters.in = input.folder;
  if (input.extension) filters.ext = input.extension;
  if (input.size) filters.size = input.size;
  if (input.modified) filters.mtime = input.modified;

  const result = await search(input.query?.trim() ?? "", filters, limit);
  return {
    results: result.hits.map((hit) => ({
      path: hit.path,
      kind: hit.kind,
      sizeBytes: hit.size,
      modified: modifiedDate(hit.mtime)?.toISOString() ?? null,
    })),
    limit,
  };
}
