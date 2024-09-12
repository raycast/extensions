import { Project, ProjectUpdate, User } from "@linear/sdk";
import { getLinearClient } from "../api/linearClient";

export type ProjectResult = Pick<
  Project,
  "id" | "name" | "description" | "icon" | "color" | "state" | "progress" | "url" | "targetDate"
> & {
  // Linear doesn't seem to expose the startDate property even though we can retrieve it
  startDate?: string;
} & {
  lead: Pick<User, "id" | "displayName" | "avatarUrl" | "email"> | null;
} & {
  members: { nodes: { id: string }[] };
} & {
  teams: { nodes: { id: string; key: string }[] };
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
  startDate
  targetDate
  members {
    nodes {
      id
    }
  }
  teams {
    nodes {
      key
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
      `,
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
      { teamId },
    );

    return data?.team.projects.nodes;
  }
}

type Roadmap = {
  id: string;
  name: string;
  projects: { nodes: { id: string }[] };
};

export async function getRoadmaps() {
  const { graphQLClient } = getLinearClient();

  const { data } = await graphQLClient.rawRequest<{ roadmaps: { nodes: Roadmap[] } }, Record<string, unknown>>(
    `
      query {
        roadmaps {
          nodes {
            id
            name
            projects {
              nodes {
                id
              }
            }
          }
        }
      }
    `,
  );

  return data?.roadmaps.nodes;
}

export type ProjectUpdateResult = Pick<ProjectUpdate, "id" | "body" | "url" | "health" | "createdAt"> & {
  user: Pick<User, "id" | "displayName" | "avatarUrl" | "email">;
};

const projectUpdateFragment = `
  id
  body
  url
  health
  createdAt
  user {
    id
    displayName
    avatarUrl
    email
  }
`;

export async function getProjectUpdates(projectId: string) {
  const { graphQLClient } = getLinearClient();

  const { data } = await graphQLClient.rawRequest<
    { project: { projectUpdates: { nodes: ProjectUpdateResult[] } } },
    { projectId: string }
  >(
    `
      query($projectId: String!) {
        project(id: $projectId) {
          projectUpdates {
            nodes {
              ${projectUpdateFragment}
            }
          }
        }
      }
    `,
    { projectId },
  );

  return data?.project.projectUpdates.nodes;
}
