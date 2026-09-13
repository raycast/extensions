import { IssueLabel } from "@linear/sdk";

import { resolveClient } from "../api/linearClient";

import { resolveToolClient, withToolAuth } from "./resolveToolWorkspace";

export type LabelResult = Pick<IssueLabel, "id" | "description" | "name">;

type Input = {
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async ({ workspaceId }: Input) => {
  const client = await resolveToolClient(workspaceId);
  const { linearClient } = resolveClient(client);

  const allLabels: LabelResult[] = [];
  let hasNextPage = true;
  let endCursor = null;

  while (hasNextPage) {
    const labels = await linearClient.issueLabels({
      after: endCursor,
      first: 100,
    });
    allLabels.push(
      ...labels.nodes.map((label) => ({
        id: label.id,
        name: label.name,
        description: label.description,
      })),
    );
    hasNextPage = labels.pageInfo.hasNextPage;
    endCursor = labels.pageInfo.endCursor;
  }

  return allLabels;
});
