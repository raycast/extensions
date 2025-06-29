import { sourcegraphInstance } from "../sourcegraph";
import { executeCommitSearch, formatSearchResults } from "./shared/search";

type Input = {
  /**
   * Search query for commit messages and metadata. Supports:
   *
   * COMMIT FILTERS:
   * - `author:username` - Commits by specific author
   * - `author:@SourcegraphUser` - Commits by Sourcegraph user
   * - `author:.*@company.com>$` - Commits by company domain
   * - `-author:username` - Exclude specific author
   * - `committer:email` - Filter by committer (when different from author)
   * - `before:"last thursday"` - Commits before specific date
   * - `after:"6 weeks ago"` - Commits after specific date
   * - `after:"november 1 2019"` - Commits after absolute date
   * - `message:"bug fix"` - Commits with specific message content
   * - `-message:"WIP"` - Exclude commits with WIP messages
   *
   * REPOSITORY FILTERS:
   * - `repo:myorg/myrepo` - Search specific repository
   * - `repo:myorg/api@feature-branch` - Search specific branch
   * - `repo:myorg/api@v1.0.0` - Search from specific tag
   * - `repo:myorg/api@v1.0.0:v2.0.0` - Search across version range
   * - `rev:at.time(2 years ago)` - Search commits at specific time
   * - `rev:at.time(2021-01-30, main)` - Time-based search from branch
   *
   * BOOLEAN OPERATORS:
   * - `fix AND bug` - Commits mentioning both fix and bug
   * - `feature OR enhancement` - Commits with either term
   * - `NOT hotfix` - Exclude hotfix commits
   */
  query: string;
  /**
   * Maximum number of results to return. Defaults to 20.
   */
  maxResults?: number;
};

/**
 * Search through commit messages and metadata in your private Sourcegraph instance.
 * This tool searches git commit history with support for filtering by author, date,
 * commit message content, and repository-specific searches.
 *
 * WHEN TO USE:
 * - Find commits related to specific features or bug fixes
 * - Track down when changes were introduced
 * - Find commits by specific authors or time periods
 * - Search commit messages for keywords or patterns
 * - Investigate project history and development timeline
 *
 * EXAMPLES:
 * - `author:alice after:"1 month ago" bug` - Alice's recent bug fixes
 * - `message:"security" before:"2023-01-01"` - Security-related commits from 2022
 * - `repo:myorg/api author:@bob feature` - Bob's feature commits in API repo
 * - `hotfix OR patch author:.*@company.com>$` - Company hotfixes and patches
 *
 * LIMITATIONS:
 * - `author` does NOT support `@me` or any similar alias - ask the human for their email instead.
 */
export default async function tool(params: Input) {
  const { query, maxResults = 40 } = params;

  const src = sourcegraphInstance();
  if (!src) {
    throw new Error(
      "No custom Sourcegraph instance configured - ask the user to configure a Sourcegraph instance in preferences, or use the 'public_' equivalent of this tool.",
    );
  }

  // Perform the commit search
  const results = await executeCommitSearch(src, query, maxResults);

  // Format results for AI consumption
  return formatSearchResults(results, src);
}
