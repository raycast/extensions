import { getGitHubClient } from "../api/githubClient";
import { withGitHubClient } from "../helpers/withGithubClient";

type Input = {
  /* If true, show notifications marked as read */
  all: boolean;

  /* If true, only shows notifications in which the user is directly participating or mentioned. */
  participating: boolean;

  /* Only show results that were last updated after the given time. This is a timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ */
  since: string;

  /* Only show notifications updated before the given time. This is a timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ. */
  before: string;
};

/**
 * Format links to pull requests as markdown link [title](https://github.com/:organization/:repo/pull/:number). IMPORTANT: use `pull`, no `pulls`
 */
async function tool(input: Input) {
  const { octokit } = getGitHubClient();

  const response = await octokit.activity.listNotificationsForAuthenticatedUser(input);
  return response.data;
}

export default withGitHubClient(tool);
