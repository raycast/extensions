import { Issue } from "@linear/sdk";
import { withAccessToken } from "@raycast/utils";

import { getLinearClient, linear } from "../api/linearClient";

import { resolveIssueLabel, resolveIssueLabelForTeam } from "./linearUtils";
import { serializeIssue } from "./serializers";
import { withLinear } from "./withLinear";

type Input = {
  /** The issue ID or identifier. Format is a combination of a team key and a unique number, like `ENG-123` */
  issueId: string;

  /** Label name or ID to add to the issue. Other labels on the issue are kept. */
  label: string;
};

export default withLinear(async ({ issueId, label }: Input) => {
  const { linearClient } = getLinearClient();
  const issue = await linearClient.issue(issueId);
  const labelId = (await resolveLabelForIssue(issue, label)).id;
  const currentLabelIds = issue.labelIds || [];
  const result = await linearClient.updateIssue(issueId, {
    labelIds: [...currentLabelIds, labelId],
  });

  if (!result.success) {
    throw new Error("Failed to add label");
  }

  const updatedIssue = await result.issue;
  if (!updatedIssue) {
    throw new Error("Failed to add label");
  }

  return serializeIssue(updatedIssue);
});

export const confirmation = withAccessToken(linear)(async ({ issueId, label: labelQuery }: Input) => {
  const { linearClient } = getLinearClient();
  const issue = await linearClient.issue(issueId);
  const label = await resolveLabelForIssue(issue, labelQuery);

  return {
    info: [
      { name: "Issue", value: issue.title },
      { name: "Label", value: label.name },
    ],
  };
});

/** Resolves the label within the issue's team, where shared names like "Bug" are unambiguous, falling back to the workspace when the issue has no team ID. */
function resolveLabelForIssue(issue: Issue, query: string) {
  return issue.teamId ? resolveIssueLabelForTeam(query, issue.teamId) : resolveIssueLabel(query);
}
