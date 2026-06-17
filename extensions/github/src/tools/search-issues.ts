import { getGitHubClient } from "../api/githubClient";
import { getBoundedPreferenceNumber } from "../components/Menu";
import { withGitHubClient } from "../helpers/withGithubClient";

type Input = {
  /**
   * The query to search for. It will always search for issues that are not archived, so no need to add `is:issue archived:false` to the query.
   *
   * Example of search queries:
   * encoding user:heroku	Encoding issues across the Heroku organization.
   * cat is:open	Find cat issues that are open.
   * strange comments:>42	Issues with more than 42 comments.
   * hard label:bug	Hard issues labeled as a bug.
   * author:mojombo	All issues authored by mojombo.
   * mentions:tpope	All issues mentioning tpope.
   * assignee:rtomayko	All issues assigned to rtomayko.
   * exception created:>2012-12-31	Created since the beginning of 2013.
   * exception updated:<2013-01-01	Last updated before 2013.
   * repo:org/repo Search issues only in owner/repo repository. Use `search-repositories` to get the full name of repository in format of `owner/repo`. Always use only `owner/repo` format for repo, never use just `repo`
   * */
  query: string;
};

export default withGitHubClient(async ({ query }: Input) => {
  const { github } = getGitHubClient();

  const result = await github.searchIssues({
    numberOfItems: getBoundedPreferenceNumber({ name: "numberOfResults", default: 50 }),
    query: `is:issue archived:false ${query}`,
  });

  return result.search.nodes;
});
