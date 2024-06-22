import { Cycle, Organization, Project, Team } from "@linear/sdk";
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
} & {
  projects: { nodes: Project["id"][] };
};

export async function getTeams(queryStr: string = "") {
  const { graphQLClient } = getLinearClient();
  const { data } = await graphQLClient.rawRequest<{ teams: { nodes: TeamResult[] } }, Record<string, unknown>>(
    `
      query($queryStr: String!) {
        teams(filter: {name: {containsIgnoreCase: $queryStr}}) {
          nodes {
            id
            name
            icon
            color
            projects {
              nodes {
                id
              }
            }
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
    { queryStr },
  );

  return data?.teams.nodes;
}
