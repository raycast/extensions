import { getGitHubClient } from "../api/githubClient";
import { PullRequest, PullRequestMergeMethod } from "../generated/graphql";
import { withGitHubClient } from "../helpers/withGithubClient";

type Input = {
  pullRequestId: string;
  mergeMethod?: "MERGE" | "REBASE" | "SQUASH";
};

export default withGitHubClient(async ({ pullRequestId, mergeMethod }: Input) => {
  const { github } = getGitHubClient();
  return github.enablePullRequestAutoMerge({
    nodeId: pullRequestId,
    mergeMethod: mergeMethod as PullRequestMergeMethod | undefined,
  });
});

export const confirmation = withGitHubClient(async ({ pullRequestId, mergeMethod }: Input) => {
  const { github } = getGitHubClient();
  const { node } = await github.pullRequestDetails({ nodeId: pullRequestId });
  const pullRequest = node as PullRequest;

  return {
    message: "Are you sure you want to enable auto-merge?",
    info: [
      { name: "PR", value: `${pullRequest.repository.nameWithOwner}: ${pullRequest.title} #${pullRequest.number}` },
      ...(mergeMethod ? [{ name: "Method", value: mergeMethod }] : []),
    ],
  };
});
