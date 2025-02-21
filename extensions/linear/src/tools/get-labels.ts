import { withAccessToken } from "@raycast/utils";
import { getLinearClient, linear } from "../api/linearClient";
import { IssueLabel } from "@linear/sdk";

export type LabelResult = Pick<IssueLabel, "id" | "description" | "name">;

export default withAccessToken(linear)(async () => {
  const { linearClient } = getLinearClient();

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
