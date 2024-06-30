import { Cycle, Organization, Team } from "@linear/sdk";
import { getLinearClient } from "./linearClient";

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
};

export async function getTeams(query: string = "") {
  const { graphQLClient } = getLinearClient();
  const { data } = await graphQLClient.rawRequest<{ teams: { nodes: TeamResult[] } }, Record<string, unknown>>(
    `
      query($query: String!) {
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
    { query },
  );

  return data?.teams.nodes;
}
