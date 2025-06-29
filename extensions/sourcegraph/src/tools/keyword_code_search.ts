import { sourcegraphInstance } from "../sourcegraph";
import { executeKeywordSearch, formatSearchResults } from "./shared/search";

type Input = {
  /**
   * The search query using keyword pattern matching. Supports:
   *
   * PATTERN SYNTAX:
   * - `foo bar` - Match documents containing both foo AND bar
   * - `"foo bar"` - Match exact phrase "foo bar"
   * - `foo OR bar` - Match documents containing foo OR bar
   * - `foo AND bar` - Explicit AND operation
   * - `NOT bar` or `-bar` - Exclude documents containing bar
   * - `/foo.*bar/` - Regular expression patterns
   * - `(foo OR bar) AND baz` - Use parentheses for grouping
   *
   * FILTERS:
   * - `repo:myorg/myrepo` - Search specific repository
   * - `repo:^github\.com/facebook/react$` - Regex repository patterns
   * - `file:\.ts$` - Search only TypeScript files
   * - `file:src/` - Search files in src directory
   * - `-file:test` - Exclude test files
   * - `lang:typescript` or `lang:go` - Search specific languages
   * - `content:"exact content"` - Search for exact content
   * - `case:yes` - Case-sensitive search
   * - `count:100` - Return up to 100 results
   * - `timeout:30s` - Custom search timeout
   * - `visibility:private` - Search only private repos
   *
   * SELECTION FILTERS:
   * - `select:repo` - Show only repository results
   * - `select:file` - Show only file paths
   * - `select:file.directory` - Show only directory paths
   * - `select:content` - Show only content matches
   * - `select:symbol` - Show only symbol results
   * - `select:symbol.function` - Show only function symbols
   * - `select:symbol.class` - Show only class symbols
   * - `select:symbol.variable` - Show only variable symbols
   *
   * REPOSITORY PREDICATES:
   * - `repo:has.path(\.go$)` - Repos containing Go files
   * - `repo:has.content(TODO)` - Repos with TODO comments
   * - `repo:has.meta(team:backend)` - Repos with metadata tags
   * - `repo:has.topic(machine-learning)` - Repos with specific topics
   * - `repo:has.commit.after(1 month ago)` - Recently active repos
   */
  query: string;
  /**
   * Maximum number of results to return. Defaults to 20.
   */
  maxResults?: number;
};

/**
 * Search for code using keyword pattern matching in your private Sourcegraph instance.
 * This tool uses Sourcegraph's powerful keyword search with support for boolean operators,
 * exact phrases, regular expressions, and comprehensive filtering options.
 *
 * WHEN TO USE:
 * - Exact string matches and literal code searches
 * - Boolean operations (AND, OR, NOT) between terms
 * - Precise filtering by repository, file type, or language
 * - Regular expression patterns for complex matching
 * - Case-sensitive searches
 *
 * EXAMPLES:
 * - `fmt.Errorf lang:go` - Find Go error handling
 * - `"user authentication" AND (login OR signin)` - Auth-related code
 * - `repo:myorg/api file:\.go$ NOT test` - Go files excluding tests
 * - `/func.*Handler/` - Functions ending with Handler
 */
export default async function tool(params: Input) {
  const { query, maxResults = 40 } = params;

  const src = sourcegraphInstance();
  if (!src) {
    throw new Error(
      "No custom Sourcegraph instance configured - ask the user to configure a Sourcegraph instance in preferences, or use the 'public_' equivalent of this tool.",
    );
  }

  // Perform the keyword search
  const results = await executeKeywordSearch(src, query, maxResults);

  // Format results for AI consumption
  return formatSearchResults(results, src);
}
