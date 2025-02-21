import { getGitHubClient } from "../api/githubClient";
import { PullRequest } from "../generated/graphql";
import { withGitHubClient } from "../helpers/withGithubClient";

type Input = {
  pullRequestId: string;
};

export default withGitHubClient(async ({ pullRequestId }: Input) => {
  const { github } = getGitHubClient();
  return github.reopenPullRequest({ nodeId: pullRequestId });
});

export const confirmation = withGitHubClient(async ({ pullRequestId }: Input) => {
  const { github } = getGitHubClient();
  const { node } = await github.pullRequestDetails({ nodeId: pullRequestId });
  const pullRequest = node as PullRequest;

  return {
    message: `Are you sure you want to re-open the PR?`,
    info: [
      { name: "PR", value: `${pullRequest.repository.nameWithOwner}: ${pullRequest.title} #${pullRequest.number}` },
    ],
  };
});
