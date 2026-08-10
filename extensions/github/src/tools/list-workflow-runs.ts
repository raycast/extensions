import { getGitHubClient } from "../api/githubClient";
import { withGitHubClient } from "../helpers/withGithubClient";

type Input = {
  /**
   * Repository name to search workflow runs. Format: `owner/repo`. Use `search-repositories` to get the full name of repository in format of `owner/repo`. Always use only `owner/repo` format for repo, never use just `repo`
   * */
  repository: string;

  branch?: string;
};

export default withGitHubClient(async ({ repository, branch }: Input) => {
  const { octokit } = getGitHubClient();

  const [owner, repo] = repository.split("/");
  return octokit.actions.listWorkflowRunsForRepo({ owner, repo, branch });
});
