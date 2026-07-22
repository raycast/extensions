import { getLinearClient } from "./linear-client";

export type ProjectStatusType = "backlog" | "planned" | "started" | "paused" | "completed" | "canceled";

export type ProjectUser = {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
};

export type ProjectListItem = {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  color: string;
  progress: number;
  url: string;
  slackChannelId: string | null;
  startDate: string | null;
  targetDate: string | null;
  status: { id: string; name: string; type: ProjectStatusType; color: string };
  lead: ProjectUser | null;
  teams: { nodes: { id: string; key: string }[] };
  initiatives: { nodes: { id: string; name: string }[] };
};

export type ProjectExternalLink = { id: string; label: string; url: string };
export type ProjectDocument = { id: string; title: string; url: string };

export type ProjectHealth = "onTrack" | "atRisk" | "offTrack" | null;

export type ProjectUpdateItem = {
  id: string;
  body: string;
  url: string;
  health: ProjectHealth;
  createdAt: string;
  user: ProjectUser;
};

export type ProjectDetail = ProjectListItem & {
  content: string | null;
  health: ProjectHealth;
  projectUpdates: { nodes: ProjectUpdateItem[] };
  externalLinks: { nodes: ProjectExternalLink[] };
  documents: { nodes: ProjectDocument[] };
};

type PageInfo = { hasNextPage: boolean; endCursor: string | null };

const projectListFragment = `
  id
  name
  description
  icon
  color
  progress
  url
  slackChannelId
  startDate
  targetDate
  status {
    id
    name
    type
    color
  }
  lead {
    id
    displayName
    email
    avatarUrl
  }
  teams {
    nodes {
      id
      key
    }
  }
  initiatives {
    nodes {
      id
      name
    }
  }
`;

type SearchProjectsOptions = {
  searchText?: string;
  first?: number;
  after?: string | null;
};

export async function searchProjects({ searchText = "", first = 25, after = null }: SearchProjectsOptions): Promise<{
  projects: ProjectListItem[];
  hasMore: boolean;
  cursor: string | null;
}> {
  const { graphQLClient } = getLinearClient();

  const { data } = await graphQLClient.rawRequest<
    { projects: { nodes: ProjectListItem[]; pageInfo: PageInfo } },
    { searchText: string; first: number; after: string | null }
  >(
    `
      query SearchProjects($searchText: String!, $first: Int!, $after: String) {
        projects(
          first: $first
          after: $after
          filter: { name: { containsIgnoreCase: $searchText } }
        ) {
          nodes {
            ${projectListFragment}
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `,
    { searchText, first, after },
  );

  const projects = data?.projects;

  return {
    projects: projects?.nodes ?? [],
    hasMore: Boolean(projects?.pageInfo.hasNextPage),
    cursor: projects?.pageInfo.endCursor ?? null,
  };
}

export async function getProjectDetail(projectId: string): Promise<ProjectDetail | null> {
  const { graphQLClient } = getLinearClient();

  const { data } = await graphQLClient.rawRequest<{ project: ProjectDetail | null }, { projectId: string }>(
    `
      query ProjectDetail($projectId: String!) {
        project(id: $projectId) {
          ${projectListFragment}
          content
          health
          projectUpdates(first: 5) {
            nodes {
              id
              body
              url
              health
              createdAt
              user {
                id
                displayName
                email
                avatarUrl
              }
            }
          }
          externalLinks(first: 25) {
            nodes {
              id
              label
              url
            }
          }
          documents(first: 25) {
            nodes {
              id
              title
              url
            }
          }
        }
      }
    `,
    { projectId },
  );

  return data?.project ?? null;
}
