import { Cycle, LinearClient, Organization, Team } from "@linear/sdk";
import { sortBy } from "lodash";

import { resolveClient } from "./linearClient";

export type TeamResult = Pick<
  Team,
  | "id"
  | "name"
  | "key"
  | "icon"
  | "color"
  | "issueEstimationType"
  | "issueEstimationAllowZero"
  | "issueEstimationExtended"
> & {
  activeCycle?: Pick<Cycle, "id" | "number">;
} & {
  membership?: {
    sortOrder: number;
  };
};

export type OrganizationResult = Pick<Organization, "logoUrl">;

export type TeamsAndOrgResult = {
  teams: { nodes: TeamResult[]; pageInfo: { hasNextPage: boolean } };
  organization: OrganizationResult;
};

export async function getTeams(query: string = "", client?: LinearClient) {
  const { graphQLClient, linearClient } = resolveClient(client);

  const me = await linearClient.viewer;

  const { data } = await graphQLClient.rawRequest<TeamsAndOrgResult, Record<string, unknown>>(
    `
      query($userId: String!, $query: String!) {
        organization {
          logoUrl
        }
        teams(filter: {name: {containsIgnoreCase: $query}}) {
          nodes {
            id
            name
            icon
            color
            key
            membership(userId: $userId) {
              sortOrder
            }
            issueEstimationType
            issueEstimationAllowZero
            issueEstimationExtended
            activeCycle {
              id
              number
            }
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `,
    { userId: me.id, query },
  );

  const teams = sortBy(data?.teams.nodes ?? [], (team) => team.membership?.sortOrder ?? Infinity);
  const organization = data?.organization;
  const hasMoreTeams = !!data?.teams.pageInfo.hasNextPage;
  return { teams, organization, hasMoreTeams };
}
