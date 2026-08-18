import { resolveClient } from "../api/linearClient";

import { describeToolWorkspace, resolveToolClient, withToolAuth } from "./resolveToolWorkspace";

type Input = {
  /** The ID of the issue to add the label to. Format is a combination of a team key and a unique number, like `ENG-123` */
  issueId: string;

  /** The ID of the label to add to the issue. Never use title as ID: you have to use `get-labels` tool to get the actual ID from the list of labels */
  labelId: string;

  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async ({ issueId, labelId, workspaceId }: Input) => {
  const client = await resolveToolClient(workspaceId);
  const { linearClient } = resolveClient(client);
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

export const confirmation = withToolAuth(async ({ issueId, labelId, workspaceId }: Input) => {
  const workspaceName = await describeToolWorkspace(workspaceId);
  const client = await resolveToolClient(workspaceId);
  const { linearClient } = resolveClient(client);
  const label = await linearClient.issueLabel(labelId);
  const issue = await linearClient.issue(issueId);

  return {
    info: [
      ...(workspaceName ? [{ name: "Workspace", value: workspaceName }] : []),
      { name: "Issue", value: issue.title },
      { name: "Label", value: label.name },
    ],
  };
});
