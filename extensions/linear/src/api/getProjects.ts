import { Milestone, Project, User } from "@linear/sdk";
import { getLinearClient } from "../helpers/withLinearClient";

export type MilestoneResult = Pick<Milestone, "id" | "name" | "sortOrder">;

export type ProjectResult = Pick<
  Project,
  "id" | "name" | "description" | "icon" | "color" | "state" | "progress" | "url" | "targetDate"
> & {
  // Linear doesn't seem to expose the startDate property even though we can retrieve it
  startDate?: string;
} & {
  lead: Pick<User, "id" | "displayName" | "avatarUrl" | "email"> | null;
} & {
  milestone: MilestoneResult | null;
} & {
  members: { nodes: { id: string }[] };
} & {
  teams: { nodes: { id: string }[] };
};

const projectFragment = `
  id
  name
  description
  icon
  color
  state
  progress
  url
  lead {
    id
    displayName
    avatarUrl
    email
  }
  milestone {
    id
    name
    sortOrder
  }
  startDate
  targetDate
  members {
    nodes {
      id
    }
  }
  teams {
    nodes {
      id
    }
  }
`;

export async function getProjects(teamId?: string) {
  const { graphQLClient } = getLinearClient();

  if (!teamId) {
    const { data } = await graphQLClient.rawRequest<{ projects: { nodes: ProjectResult[] } }, Record<string, unknown>>(
      `
        query {
          projects {
            nodes {
              ${projectFragment}
            }
          }
        }
      `
    );

    return data?.projects.nodes;
  } else {
    const { data } = await graphQLClient.rawRequest<
      { team: { projects: { nodes: ProjectResult[] } } },
      Record<string, unknown>
    >(
      `
        query($teamId: String!) {
          team(id: $teamId) {
            projects {
              nodes {
                ${projectFragment}
              }
            }
          }
        }
      `,
      { teamId }
    );

    return data?.team.projects.nodes;
  }
}
