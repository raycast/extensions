import { getGitHubClient } from "../api/githubClient";
import { withGitHubClient } from "../helpers/withGithubClient";

type Input = {
  pullRequestId: string;
};

export default withGitHubClient(async ({ pullRequestId }: Input) => {
  const { github } = getGitHubClient();
  return github.disablePullRequestAutoMerge({ nodeId: pullRequestId });
});
