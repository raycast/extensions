import { CustomView, Team } from "@linear/sdk";

import { IssueFragment, IssueResult } from "../api/getIssues";
import { getLinearClient } from "../api/linearClient";

export type CustomViewResult = Pick<CustomView, "id" | "name" | "icon" | "color" | "shared"> & {
  modelName: string;
  team?: Pick<Team, "id" | "name" | "key">;
};

export async function getCustomViews(): Promise<CustomViewResult[]> {
  const { graphQLClient } = getLinearClient();
  const { data } = await graphQLClient.rawRequest<
    { customViews: { nodes: CustomViewResult[] } },
    Record<string, unknown>
  >(
    `
      query {
        customViews(first: 50) {
          nodes {
            id
            name
            icon
            color
            shared
            modelName
            team {
              id
              name
              key
            }
          }
        }
      }
    `,
  );

  return data?.customViews.nodes ?? [];
}

export async function getCustomViewIssues(viewId: string): Promise<IssueResult[]> {
  const { graphQLClient } = getLinearClient();
  const { data } = await graphQLClient.rawRequest<
    { customView: { issues: { nodes: IssueResult[] } } },
    { viewId: string }
  >(
    `
      query($viewId: String!) {
        customView(id: $viewId) {
          issues {
            nodes {
              ${IssueFragment}
            }
          }
        }
      }
    `,
    { viewId },
  );

  return data?.customView.issues.nodes ?? [];
}
