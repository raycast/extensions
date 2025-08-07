import { sourcegraphDotCom } from "../sourcegraph";
import { executeCommitSearch, formatSearchResults } from "./shared/search";

type Input = {
  /**
   * Search query for commit messages and metadata in public repositories. Supports:
   *
   * COMMIT FILTERS:
   * - `author:torvalds` - Commits by specific author (e.g., Linus Torvalds)
   * - `author:.*@facebook.com>$` - Commits by Facebook employees
   * - `author:@githubusername` - Commits by GitHub user
   * - `before:"last year"` - Commits before specific date
   * - `after:"2020-01-01"` - Commits after specific date
   * - `message:"security fix"` - Commits with specific message content
   * - `-message:"merge"` - Exclude merge commits
   *
   * REPOSITORY FILTERS:
   * - `repo:facebook/react` - Search specific repository
   * - `repo:^github\.com/microsoft/` - Search all Microsoft repos
   * - `repo:tensorflow/tensorflow@v2.0.0` - Search from specific tag
   * - `fork:yes` - Include forked repositories
   * - `archived:no` - Exclude archived repositories
   *
   * BOOLEAN OPERATORS:
   * - `security AND vulnerability` - Security-related commits
   * - `performance OR optimization` - Performance improvements
   * - `NOT revert` - Exclude revert commits
   *
   * EXAMPLES FOR LEARNING:
   * - Study how major projects handle security fixes
   * - Learn from commit practices of top developers
   * - Track feature development in popular frameworks
   */
  query: string;
  /**
   * Maximum number of results to return. Defaults to 20.
   */
  maxResults?: number;
};

/**
 * Search through commit messages and metadata across public repositories on Sourcegraph.com.
 * This tool searches git commit history in millions of open source projects with support
 * for filtering by author, date, commit message content, and repository-specific searches.
 *
 * WHEN TO USE:
 * - Study commit practices in popular open source projects
 * - Find examples of how features were implemented
 * - Track security fixes and patches across projects
 * - Learn from commit messages of experienced developers
 * - Research project development history and patterns
 *
 * EXAMPLES:
 * - `repo:facebook/react author:gaearon feature` - Dan Abramov's React features
 * - `security AND CVE after:"2023-01-01"` - Recent security fixes
 * - `repo:^github\.com/golang/ author:.*@google.com>$ performance` - Go team optimizations
 * - `message:"breaking change" repo:^github\.com/vuejs/` - Vue.js breaking changes
 */
export default async function tool(params: Input) {
  const { query, maxResults = 20 } = params;
  // Create Sourcegraph client for public code search
  const src = await sourcegraphDotCom();

  // Perform the commit search
  const results = await executeCommitSearch(src, query, maxResults);

  // Format results for AI consumption
  return formatSearchResults(results, src);
}
