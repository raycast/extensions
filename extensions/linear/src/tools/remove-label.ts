import { Issue } from "@linear/sdk";
import { Action } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";

import { getLinearClient, linear } from "../api/linearClient";

import { findExact } from "./linearUtils";
import { serializeIssue } from "./serializers";
import { withLinear } from "./withLinear";

type Input = {
  /** The issue ID or identifier. Format is a combination of a team key and a unique number, like `ENG-123` */
  issueId: string;

  /** Label name or ID to remove from the issue. Other labels on the issue are kept. */
  label: string;
};

export default withLinear(async ({ issueId, label }: Input) => {
  const { linearClient } = getLinearClient();
  const issue = await linearClient.issue(issueId);
  const labelId = (await findIssueLabel(issue, label)).id;
  const currentLabelIds = issue.labelIds || [];
  const updatedLabelIds = currentLabelIds.filter((id) => id !== labelId);
  const result = await linearClient.updateIssue(issueId, {
    labelIds: updatedLabelIds,
  });

  if (!result.success) {
    throw new Error("Failed to remove label");
  }

  const updatedIssue = await result.issue;
  if (!updatedIssue) {
    throw new Error("Failed to remove label");
  }

  return serializeIssue(updatedIssue);
});

export const confirmation = withAccessToken(linear)(async ({ issueId, label: labelQuery }: Input) => {
  const { linearClient } = getLinearClient();

  const issue = await linearClient.issue(issueId);
  const label = await findIssueLabel(issue, labelQuery);

  return {
    style: Action.Style.Destructive,
    info: [
      { name: "Issue", value: issue.title },
      { name: "Label", value: label.name },
    ],
  };
});

/** Finds the label to remove among the issue's current labels, so a name shared by several teams' labels still identifies the one on this issue. */
async function findIssueLabel(issue: Issue, query: string) {
  return findExact((await issue.labels({ first: 250 })).nodes, query, "label on this issue");
}
