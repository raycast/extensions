import { getPreferenceValues } from "@raycast/api";
import { disconnect, searchFiles } from "../fsearch";
import { normalizeQuery } from "../format";

type Input = {
  /**
   * The search, in fsearch syntax. Plain words match file names with typo
   * tolerance. Filters: `ext:pdf`, `type:image`, `in:~/Downloads`,
   * `mtime:<7d`, `size:>100mb`. Search inside files with `grep:text` or
   * `regex:pattern`. Example: `invoice ext:pdf mtime:<30d`.
   */
  query: string;
  /**
   * Absolute folder to search within. Omit to use the Search Folder from the
   * extension's preferences, or the whole Mac when none is set. Pass "/" to
   * search the whole Mac regardless of that preference.
   */
  folder?: string;
  /** Maximum number of files to return, 1 to 100. Default 20. */
  limit?: number;
};

/** Content search gets a longer read budget than the interactive command. */
const CONTENT_BUDGET_MS = 1500;

/**
 * The folder the search is limited to: the one the model asked for, else the
 * Search Folder preference. A query that carries its own `in:` filter, or a
 * folder of "/", means the whole Mac; neither is narrowed by the preference.
 */
function searchRoot(
  query: string,
  folder: string | undefined,
  preference: string | undefined,
): string | undefined {
  const chosen = folder?.trim();
  if (chosen) return chosen === "/" ? undefined : chosen;
  if (/(^|\s)in:/.test(query)) return undefined;
  return preference?.trim() || undefined;
}

export default async function tool(input: Input) {
  const preferences = getPreferenceValues<Preferences>();
  const limit = Math.min(100, Math.max(1, Math.round(input.limit ?? 20)));
  const query = normalizeQuery(input.query);
  try {
    const result = await searchFiles(
      preferences.binaryPath?.trim() ?? "",
      query,
      searchRoot(query, input.folder, preferences.searchRoot),
      limit,
      new AbortController().signal,
      { budgetMs: CONTENT_BUDGET_MS },
    );
    return {
      complete: result.complete,
      indexing: result.indexing,
      files: result.files.map((file) => ({
        path: file.path,
        kind: file.kind,
        size: file.size,
        modified: file.mtime
          ? new Date(file.mtime * 1000).toISOString()
          : undefined,
        matches: file.matches,
      })),
    };
  } finally {
    disconnect();
  }
}
