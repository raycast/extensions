import { IssueLabel } from "@linear/sdk";
import { getLinearClient } from "../helpers/withLinearClient";

export type LabelResult = Pick<IssueLabel, "id" | "name" | "color">;

export async function getLabels(teamId?: string) {
  if (!teamId) {
    return [];
  }

  const { graphQLClient } = getLinearClient();
  const { data } = await graphQLClient.rawRequest<
    { team: { labels: { nodes: LabelResult[] } } },
    Record<string, unknown>
  >(
    `
      query($teamId: String!) {
        team(id: $teamId) {
          labels {
            nodes {
              id
              name
              color
            }
          }
        }
      }
    `,
    { teamId }
  );

  return data?.team.labels.nodes;
}
