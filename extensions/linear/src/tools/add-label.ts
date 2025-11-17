import { withAccessToken } from "@raycast/utils";

import { getLinearClient, linear } from "../api/linearClient";

type Input = {
  /** The ID of the issue to add the label to. Format is a combination of a team key and a unique number, like `ENG-123` */
  issueId: string;

  /** The ID of the label to add to the issue. Never use title as ID: you have to use `get-labels` tool to get the actual ID from the list of labels */
  labelId: string;
};

export default withAccessToken(linear)(async ({ issueId, labelId }: Input) => {
  const { linearClient } = getLinearClient();
  const issue = await linearClient.issue(issueId);
  const currentLabelIds = issue.labelIds || [];
  const result = await linearClient.updateIssue(issueId, {
    labelIds: [...currentLabelIds, labelId],
  });

  if (!result.success) {
    throw new Error("Failed to add label");
  }

  return result.issue;
});

export const confirmation = withAccessToken(linear)(async ({ issueId, labelId }: Input) => {
  const { linearClient } = getLinearClient();
  const label = await linearClient.issueLabel(labelId);
  const issue = await linearClient.issue(issueId);

  return {
    info: [
      { name: "Issue", value: issue.title },
      { name: "Label", value: label.name },
    ],
  };
});
