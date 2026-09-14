import { CustomView, LinearClient, Team } from "@linear/sdk";

import { IssueFragment, IssueResult } from "../api/getIssues";
import { resolveClient } from "../api/linearClient";
import { getPaginated, PageInfo } from "../api/pagination";

export type CustomViewResult = Pick<CustomView, "id" | "name" | "icon" | "color" | "shared"> & {
  modelName: string;
  team?: Pick<Team, "id" | "name" | "key">;
};

export async function getCustomViews(client?: LinearClient): Promise<CustomViewResult[]> {
  const { graphQLClient } = resolveClient(client);

  const allViews = await getPaginated(
    async (cursor) =>
      graphQLClient.rawRequest<
        { customViews: { nodes: CustomViewResult[]; pageInfo: PageInfo } },
        Record<string, unknown>
      >(
        `
          query($cursor: String) {
            customViews(first: 50, after: $cursor) {
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
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        `,
        { cursor },
      ),
    (r) => r.data?.customViews?.pageInfo,
    (accumulator: CustomViewResult[], currentValue) => accumulator.concat(currentValue.data?.customViews?.nodes ?? []),
    [],
    5,
  );

  return allViews.filter((v) => v.modelName === "Issue");
}

export async function getCustomViewIssues(viewId: string, client?: LinearClient): Promise<IssueResult[]> {
  const { graphQLClient } = resolveClient(client);

  return getPaginated(
    async (cursor) =>
      graphQLClient.rawRequest<
        {
          customView?: {
            issues?: { nodes?: IssueResult[]; pageInfo?: PageInfo | null } | null;
          } | null;
        },
        { viewId: string; cursor?: string }
      >(
        `
          query($viewId: String!, $cursor: String) {
            customView(id: $viewId) {
              issues(first: 50, after: $cursor) {
                nodes {
                  ${IssueFragment}
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          }
        `,
        { viewId, cursor },
      ),
    (r) => r.data?.customView?.issues?.pageInfo ?? undefined,
    (accumulator: IssueResult[], currentValue) =>
      accumulator.concat(currentValue.data?.customView?.issues?.nodes ?? []),
    [],
    5,
  );
}
