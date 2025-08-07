import { sourcegraphInstance } from "../sourcegraph";
import { executeDiffSearch, formatSearchResults } from "./shared/search";

type Input = {
  /**
   * Search query for code changes and diffs. Supports:
   *
   * DIFF-SPECIFIC SEARCHES:
   * - `function handleAuth` - Find diffs that added/removed this function
   * - `"bug fix"` - Search for exact phrases in changed code
   * - `/import.*react/` - Regular expressions in code changes
   * - `+ console.log` - Find added lines containing console.log
   * - `- deprecated` - Find removed lines with deprecated code
   *
   * COMMIT FILTERS (same as commit search):
   * - `author:username` - Changes by specific author
   * - `author:.*@company.com>$` - Changes by company domain
   * - `before:"last month"` - Changes before specific date
   * - `after:"2023-01-01"` - Changes after specific date
   * - `message:"refactor"` - Changes with specific commit message
   *
   * REPOSITORY & FILE FILTERS:
   * - `repo:myorg/api` - Search specific repository
   * - `repo:myorg/api@feature-branch` - Search specific branch
   * - `file:\.go$` - Changes only in Go files
   * - `file:src/components/` - Changes in specific directory
   * - `-file:test` - Exclude test files
   *
   * SELECTION FILTERS:
   * - `select:commit.diff.added` - Show only added code
   * - `select:commit.diff.removed` - Show only removed code
   *
   * BOOLEAN OPERATORS:
   * - `auth AND login` - Diffs containing both terms
   * - `TODO OR FIXME` - Diffs with todo items
   * - `NOT test` - Exclude test-related changes
   */
  query: string;
  /**
   * Maximum number of results to return. Defaults to 20.
   */
  maxResults?: number;
};

/**
 * Search through code changes and diffs in your private Sourcegraph instance.
 * This tool searches the actual content of code modifications, additions, and deletions
 * across your git history, with powerful filtering by author, time, file type, and more.
 *
 * WHEN TO USE:
 * - Find when specific code patterns were introduced or removed
 * - Track the evolution of particular functions or features
 * - Investigate bug introduction or fix implementation
 * - Find examples of how certain refactoring was done
 * - Analyze code changes by specific developers or time periods
 *
 * EXAMPLES:
 * - `handleAuth author:alice after:"1 month ago"` - Alice's auth changes
 * - `select:commit.diff.added import.*react file:\.tsx?$` - New React imports
 * - `deprecated AND -message:"remove deprecated"` - Deprecated code additions
 * - `/function.*Handler/ repo:myorg/api` - Handler function changes in API
 */
export default async function tool(params: Input) {
  const { query, maxResults = 40 } = params;

  const src = sourcegraphInstance();
  if (!src) {
    throw new Error(
      "No custom Sourcegraph instance configured - ask the user to configure a Sourcegraph instance in preferences, or use the 'public_' equivalent of this tool.",
    );
  }

  // Perform the diff search
  const results = await executeDiffSearch(src, query, maxResults);

  // Format results for AI consumption
  return formatSearchResults(results, src);
}
