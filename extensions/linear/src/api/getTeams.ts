import { Cycle, Organization, Team } from "@linear/sdk";
import { getLinearClient } from "./linearClient";
import { sortBy } from "lodash";

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
  organization: Pick<Organization, "logoUrl">;
} & {
  activeCycle?: Pick<Cycle, "id" | "number">;
} & {
  membership?: {
    sortOrder: number;
  };
};

export async function getTeams(query: string = "") {
  const { graphQLClient, linearClient } = getLinearClient();

  const me = await linearClient.viewer;

  const { data } = await graphQLClient.rawRequest<{ teams: { nodes: TeamResult[] } }, Record<string, unknown>>(
    `
      query($userId: String!, $query: String!) {
        teams(filter: {name: {containsIgnoreCase: $query}}) {
          nodes {
            id
            name
            icon
            color
            organization {
              logoUrl
            }
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
        }
      }
    `,
    { userId: me.id, query },
  );

  const teams = data?.teams.nodes ?? [];
  return sortBy(teams, (team) => team.membership?.sortOrder ?? Infinity);
}
