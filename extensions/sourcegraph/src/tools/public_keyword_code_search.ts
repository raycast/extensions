import { sourcegraphDotCom } from "../sourcegraph";
import { executeKeywordSearch, formatSearchResults } from "./shared/search";

type Input = {
  /**
   * The search query using keyword pattern matching in public repositories. Supports:
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
   * - `repo:facebook/react` - Search specific repository
   * - `repo:^github\.com/microsoft/` - Search Microsoft's repos
   * - `file:\.py$` - Search only Python files
   * - `file:src/` - Search files in src directory
   * - `-file:test` - Exclude test files
   * - `lang:python` or `lang:javascript` - Search specific languages
   * - `content:"exact content"` - Search for exact content
   * - `case:yes` - Case-sensitive search
   * - `count:100` - Return up to 100 results
   * - `timeout:30s` - Custom search timeout
   * - `fork:yes` - Include forked repositories
   * - `archived:no` - Exclude archived repositories
   * - `visibility:public` - Search only public repos
   *
   * SELECTION FILTERS:
   * - `select:repo` - Show only repository results
   * - `select:file` - Show only file paths
   * - `select:file.directory` - Show only directory paths
   * - `select:content` - Show only content matches
   * - `select:symbol` - Show only symbol results
   * - `select:symbol.function` - Show only function symbols
   * - `select:symbol.class` - Show only class symbols
   *
   * REPOSITORY PREDICATES:
   * - `repo:has.path(requirements\.txt)` - Repos with Python dependencies
   * - `repo:has.content(machine learning)` - ML-related repositories
   * - `repo:has.topic(react)` - Repos tagged with React topic
   * - `repo:has.commit.after(6 months ago)` - Recently active projects
   */
  query: string;
  /**
   * Maximum number of results to return. Defaults to 20.
   */
  maxResults?: number;
};

/**
 * Search for code using keyword pattern matching across public repositories on Sourcegraph.com.
 * This tool searches millions of open source repositories with Sourcegraph's powerful keyword search,
 * supporting boolean operators, exact phrases, regular expressions, and comprehensive filtering.
 *
 * WHEN TO USE:
 * - Find examples in popular open source projects
 * - Exact string matches and literal code searches
 * - Boolean operations (AND, OR, NOT) between terms
 * - Precise filtering by repository, file type, or language
 * - Regular expression patterns for complex matching
 *
 * EXAMPLES:
 * - `useState lang:typescript repo:facebook/react` - React hooks usage
 * - `"machine learning" AND python file:\.py$` - ML code in Python
 * - `repo:^github\.com/tensorflow/ /def.*train/` - TensorFlow training functions
 * - `HTTP AND (client OR request) -file:test` - HTTP clients excluding tests
 */
export default async function tool(params: Input) {
  const { query, maxResults = 20 } = params;
  // Create Sourcegraph client for public code search
  const src = await sourcegraphDotCom();

  // Perform the keyword search
  const results = await executeKeywordSearch(src, query, maxResults);

  // Format results for AI consumption
  return formatSearchResults(results, src);
}
