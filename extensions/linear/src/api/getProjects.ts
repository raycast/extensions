import { Project, ProjectStatus, ProjectUpdate, User } from "@linear/sdk";

import { getLinearClient } from "../api/linearClient";

export type ProjectResult = Pick<
  Project,
  "id" | "name" | "description" | "icon" | "color" | "progress" | "url" | "targetDate"
> & {
  // Linear doesn't seem to expose the startDate property even though we can retrieve it
  startDate?: string;
} & {
  lead: Pick<User, "id" | "displayName" | "avatarUrl" | "email"> | null;
} & {
  members: { nodes: { id: string }[] };
} & {
  teams: { nodes: { id: string; key: string }[] };
} & {
  status: Pick<ProjectStatus, "id" | "name" | "type" | "color">;
};

type PageInfo = {
  endCursor: string;
  hasNextPage: boolean;
};

type PaginatedResponse<Node> = {
  nodes: Node[];
  pageInfo: PageInfo;
};

type ProjectsResponse = {
  projects: PaginatedResponse<ProjectResult>;
};

type TeamProjectsResponse = {
  team: ProjectsResponse;
};

type GetProjectsOptions = {
  teamId?: string;
  searchText?: string;
  first?: number | null;
  after?: string | null;
};

type GetProjectsResult = {
  data: ProjectResult[];
  hasMore: boolean;
  cursor: string | null;
};

const projectFragment = `
  id
  name
  description
  icon
  color
  progress
  url
  status {
    id
    name
    type
    color
  }
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

export async function getProjects({
  teamId,
  searchText = "",
  after = null,
  first = null,
}: GetProjectsOptions): Promise<GetProjectsResult> {
  const { graphQLClient } = getLinearClient();

  const projectsQueryFragment = `
    projects(first: $first, after: $after, filter: { name: { containsIgnoreCase: $searchText } }) {
      nodes {
        ${projectFragment}
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  `;

  if (!teamId) {
    const { data } = await graphQLClient.rawRequest<ProjectsResponse, Omit<GetProjectsOptions, "teamId">>(
      `
        query($first: Int, $after: String, $searchText: String) {
          ${projectsQueryFragment}
        }
      `,
      { first, after, searchText },
    );

    const projects = data?.projects;

    return {
      data: projects?.nodes ?? [],
      hasMore: !!projects?.pageInfo.hasNextPage,
      cursor: projects?.pageInfo.endCursor || null,
    };
  }

  const { data } = await graphQLClient.rawRequest<TeamProjectsResponse, GetProjectsOptions>(
    `
      query($teamId: String!, $first: Int, $after: String, $searchText: String) {
        team(id: $teamId) {
          ${projectsQueryFragment}
        }
      }
    `,
    { teamId, first, after, searchText },
  );

  const projects = data?.team?.projects;

  return {
    data: projects?.nodes ?? [],
    hasMore: !!projects?.pageInfo.hasNextPage,
    cursor: projects?.pageInfo.endCursor || null,
  };
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
