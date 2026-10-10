import { request } from "../lib/fsearch";
import { formatForAI } from "../lib/tool-output";

type Input = {
  /** Text, regular expression, or symbol name to find inside files. */
  pattern: string;
  /**
   * How to interpret the pattern. "literal" matches the text as-is (smart-case), "regex" treats it as a regular expression,
   * and "symbol" finds where a function, type, or variable with that name is defined. Defaults to "literal".
   */
  mode?: "literal" | "regex" | "symbol";
  /** Only search inside this folder. Absolute path or starting with ~, e.g. "~/Developer/my-app". Strongly recommended. */
  folder?: string;
  /** Comma-separated file extensions without dots, e.g. "ts,tsx" or "md". */
  extension?: string;
  /** Optional words to fuzzy-match against file names to narrow which files are read. */
  fileName?: string;
  /** Maximum number of files to return. Defaults to 20. */
  limit?: number;
};

/**
 * Search inside files on the user's Mac with the fsearch content index, like a fast grep.
 * Returns matching files with line numbers and the matching lines (up to 5 per file).
 */
export default async function tool(input: Input) {
  const payload: Record<string, string | number> = {
    op: "grep",
    pattern: input.pattern,
    mode: input.mode ?? "literal",
    q: input.fileName ?? "",
    limit: input.limit ?? 20,
    per_file: 5,
  };
  if (input.folder) payload.in = input.folder;
  if (input.extension) payload.ext = input.extension;
  return formatForAI(await request(payload));
}
