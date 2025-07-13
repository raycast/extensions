import { getGitHubClient } from "../api/githubClient";
import { Issue, IssueClosedStateReason } from "../generated/graphql";
import { withGitHubClient } from "../helpers/withGithubClient";

type Input = {
  issueId: string;

  /**
   * COMPLETED: An issue that has been closed as completed
   * NOT_PLANNED: An issue that has been closed as not planned
   */
  stateReason: "COMPLETED" | "NOT_PLANNED";
};

export default withGitHubClient(async ({ issueId, stateReason }: Input) => {
  const { github } = getGitHubClient();
  return github.closeIssue({ nodeId: issueId, stateReason: stateReason as IssueClosedStateReason });
});

export const confirmation = withGitHubClient(async ({ issueId, stateReason }: Input) => {
  const { github } = getGitHubClient();
  const { node } = await github.issueDetails({ nodeId: issueId });
  const issue = node as Issue;

  return {
    message: `Are you sure you want to close the issue?`,
    info: [
      { name: "Issue", value: `${issue.repository.nameWithOwner}: ${issue.title} #${issue.number}` },
      { name: "Reason", value: stateReason },
    ],
  };
});
