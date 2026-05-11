import { getGitHubClient } from "../api/githubClient";
import { getBoundedPreferenceNumber } from "../components/Menu";
import { withGitHubClient } from "../helpers/withGithubClient";

type Input = {
  /**
   * The query to search for. It will always search for pull requests that are not archived, so no need to add `is:pr` and `archived:false` to the query.
   * If user doesn't provide another instructions, always search for open PRs (`is:open`)
   *
   * Example of search queries:
   * encoding user:heroku	Encoding pull requests across the Heroku organization.
   * cat is:open	Find cat pull requests that are open.
   * strange comments:>42	pull requests with more than 42 comments.
   * hard label:bug	Hard pull requests labeled as a bug.
   * author:mojombo	All pull requests authored by mojombo.
   * mentions:tpope	All pull requests mentioning tpope.
   * assignee:rtomayko	All pull requests assigned to rtomayko.
   * exception created:>2012-12-31	Created since the beginning of 2013.
   * exception updated:<2013-01-01	Last updated before 2013.
   * repo:org/repo Search PRs only in `owner/repo` repository. Use `search-repositories` to get the full name of repository in format of `owner/repo`. Always use only `owner/repo` format for repo, never use just `repo`
   * Format links to pull requests as markdown link [title](https://github.com/:organization/:repo/pull/:number)
   * */
  query: string;
};

export default withGitHubClient(async ({ query }: Input) => {
  const { github } = getGitHubClient();

  const result = await github.searchPullRequests({
    numberOfItems: getBoundedPreferenceNumber({ name: "numberOfResults", default: 50 }),
    query: `is:pr archived:false ${query}`,
  });

  return result.search.edges?.map((edge) => edge?.node);
});
