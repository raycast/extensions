import type { SearchOptions } from "../types/search";

/**
 * Builds the full ripgrep argv (excluding the executable). Safety invariants:
 *
 * - Never executed through a shell; every value is its own argv entry.
 * - The output protocol (`--json`) and config isolation (`--no-config`) come
 *   first and cannot be overridden by anything user-derived.
 * - The query is passed as a single `--regexp=<query>` token, so a query
 *   starting with `-` can never be parsed as a flag.
 * - The search root is the only positional argument and sits after `--`.
 * - There is no global result-count flag in ripgrep (`--max-count` is
 *   per-file); `options.maxResults` is enforced by the stream consumer.
 */
export function buildRipgrepArgs(query: string, directory: string, options: SearchOptions): string[] {
  const args = ["--json", "--no-config"];

  if (options.caseMode === "smart") args.push("--smart-case");
  if (options.caseMode === "insensitive") args.push("--ignore-case");
  if (options.caseMode === "sensitive") args.push("--case-sensitive");

  if (options.searchMode === "text") args.push("--fixed-strings");
  if (options.wholeWord) args.push("--word-regexp");
  if (options.multiline) args.push("--multiline");
  if (options.invertMatch) args.push("--invert-match");

  if (options.maxDepth !== null) args.push(`--max-depth=${options.maxDepth}`);
  if (options.includeHidden) args.push("--hidden");
  if (options.followSymlinks) args.push("--follow");
  if (!options.respectIgnoreFiles) args.push("--no-ignore");
  if (options.includeBinary) args.push("--text");
  args.push(`--max-filesize=${options.maxFileSizeBytes}`);

  if (options.contextBefore > 0) args.push(`--before-context=${options.contextBefore}`);
  if (options.contextAfter > 0) args.push(`--after-context=${options.contextAfter}`);

  // Includes first, exclusions last: ripgrep globs follow gitignore semantics
  // where the last matching pattern wins, so exclusions must take precedence.
  for (const ext of options.includedExtensions) args.push(`--glob=*.${ext}`);
  for (const glob of options.includeGlobs) args.push(`--glob=${glob}`);
  for (const ext of options.excludedExtensions) args.push(`--glob=!*.${ext}`);
  for (const dir of options.excludedDirectories) args.push(`--glob=!**/${dir}/**`);
  for (const glob of options.excludeGlobs) args.push(`--glob=!${glob.replace(/^!/, "")}`);

  args.push(`--regexp=${query}`, "--", directory);
  return args;
}
