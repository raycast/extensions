import { getGitHubClient } from "../api/githubClient";
import { Issue } from "../generated/graphql";
import { withGitHubClient } from "../helpers/withGithubClient";

type Input = {
  issueId: string;
};

export default withGitHubClient(async ({ issueId }: Input) => {
  const { github } = getGitHubClient();
  return github.reopenIssue({ nodeId: issueId });
});

export const confirmation = withGitHubClient(async ({ issueId }: Input) => {
  const { github } = getGitHubClient();
  const { node } = await github.issueDetails({ nodeId: issueId });
  const issue = node as Issue;

  return {
    message: `Are you sure you want to reopen the issue?`,
    info: [{ name: "Issue", value: `${issue.repository.nameWithOwner}: ${issue.title} #${issue.number}` }],
  };
});
