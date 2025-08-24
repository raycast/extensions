import { IssueLabel } from "@linear/sdk";

import { getLinearClient } from "../api/linearClient";

export type LabelResult = Pick<IssueLabel, "id" | "name" | "color">;

export async function getLabels(teamId?: string) {
  if (!teamId) {
    return [];
  }

  const { graphQLClient } = getLinearClient();
  // Only the 100 first labels are returned in case a workspace has a lot of labels
  // TODO: Implement label's name filtering when form fields support onSearchTextChange prop
  const { data } = await graphQLClient.rawRequest<
    { team: { labels: { nodes: LabelResult[] } } },
    Record<string, unknown>
  >(
    `
      query($teamId: String!) {
        team(id: $teamId) {
          labels(first: 100) {
            nodes {
              id
              name
              color
            }
          }
        }
      }
    `,
    { teamId },
  );

  return data?.team.labels.nodes;
}
