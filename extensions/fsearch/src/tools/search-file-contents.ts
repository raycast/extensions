import { grep, type Filters } from "../lib/fsearch";

type Input = {
  /** Text, regular expression, or symbol name to find. Literal text is kept exactly, including spaces and colons. */
  pattern: string;
  /** literal uses smart-case (uppercase makes it case-sensitive); regex matches a regular expression; symbol finds definitions. Defaults to literal. */
  mode?: "literal" | "regex" | "symbol";
  /** Folder to search within, as an absolute path or ~/ path. Spaces are supported. Prefer the user's project folder. */
  folder?: string;
  /** Comma-separated file extensions without dots, such as ts,tsx or md. */
  extension?: string;
  /** Optional filename query to narrow candidate files. Supports ext:, type:, size:, mtime: and other file filters. Keep the content pattern separate. */
  fileQuery?: string;
  /** Maximum matching files, from 1 to 100. Defaults to 20, with up to five matching lines per file. */
  limit?: number;
};

/** Search file contents for text, regex matches or symbol definitions. Returns paths and matching lines with line numbers, plus search completeness and indexing status. */
export default async function tool(input: Input) {
  if (!input.pattern.trim()) throw new Error("Provide a non-empty content search pattern");
  const limit = input.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("limit must be an integer from 1 to 100");
  }

  const filters: Filters = {};
  if (input.folder) filters.in = input.folder;
  if (input.extension) filters.ext = input.extension;
  const result = await grep(input.pattern, input.fileQuery ?? "", input.mode ?? "literal", undefined, {
    filters,
    limit,
    perFile: 5,
  });
  return { files: result.files, complete: result.complete, indexing: result.indexing, limit, matchesPerFile: 5 };
}
