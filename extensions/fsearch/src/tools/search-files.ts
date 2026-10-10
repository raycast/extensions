import { request } from "../lib/fsearch";
import { formatForAI } from "../lib/tool-output";

type Input = {
  /**
   * Words to fuzzy-match against file and folder names, e.g. "invoice 2024" or "main.rs".
   * Supports fsearch operators: 'exact, ^prefix, suffix$, !exclude. Use an empty string to match everything (combine with filters).
   */
  query: string;
  /** Only search inside this folder. Absolute path or starting with ~, e.g. "~/Documents". */
  folder?: string;
  /** Comma-separated file extensions without dots, e.g. "pdf" or "ts,tsx". */
  extension?: string;
  /** File category. */
  type?: "image" | "video" | "audio" | "doc" | "code" | "archive" | "font" | "app";
  /** Restrict to files or folders. */
  kind?: "file" | "dir";
  /** Size filter with a comparison and unit, e.g. ">5mb", "<100kb", "1gb..4gb". */
  size?: string;
  /** Modification-age filter, e.g. "<7d" (changed in the last 7 days), ">1y", "<2h". Units: min, h, d, w, mo, y. */
  modified?: string;
  /** Maximum number of results. Defaults to 30. */
  limit?: number;
};

/**
 * Find files and folders anywhere on the user's Mac by name, using the fsearch index.
 * Results are ranked by relevance and include path, kind, size in bytes, and modification time.
 */
export default async function tool(input: Input) {
  const payload: Record<string, string | number> = { q: input.query, limit: input.limit ?? 30 };
  if (input.folder) payload.in = input.folder;
  if (input.extension) payload.ext = input.extension;
  if (input.type) payload.type = input.type;
  if (input.kind) payload.kind = input.kind;
  if (input.size) payload.size = input.size;
  if (input.modified) payload.mtime = input.modified;
  return formatForAI(await request(payload));
}
