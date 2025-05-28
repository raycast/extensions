import { getGitHubClient } from "../api/githubClient";
import { PullRequest, PullRequestMergeMethod } from "../generated/graphql";
import { withGitHubClient } from "../helpers/withGithubClient";

type Input = {
  pullRequestId: string;
  method: "MERGE" | "REBASE" | "SQUASH";
};

export default withGitHubClient(async ({ pullRequestId, method }: Input) => {
  const { github } = getGitHubClient();
  return github.mergePullRequest({ nodeId: pullRequestId, method: method as PullRequestMergeMethod });
});

export const confirmation = withGitHubClient(async ({ pullRequestId, method }: Input) => {
  const { github } = getGitHubClient();
  const { node } = await github.pullRequestDetails({ nodeId: pullRequestId });
  const pullRequest = node as PullRequest;

  return {
    message: `Are you sure you want to merge the PR?`,
    info: [
      { name: "PR", value: `${pullRequest.repository.nameWithOwner}: ${pullRequest.title} #${pullRequest.number}` },
      { name: "Method", value: method },
    ],
  };
});
