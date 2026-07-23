import type { Repository } from './types';
import { Octokit } from '@octokit/core';

interface RepoNode {
  databaseId: number | string;
  name: string;
  nameWithOwner: string;
  description?: string | null;
  url: string;
  updatedAt: string;
  isFork: boolean;
  isPrivate: boolean;
  stargazerCount: number;
  issues: { totalCount: number };
  pullRequests: { totalCount: number };
  owner: { login: string };
  parent?: { nameWithOwner?: string | null } | null;
}

interface OrgsQueryResult {
  viewer: {
    login: string;
    organizations: {
      nodes: { login: string }[];
    };
  };
}

interface ReposQueryResult {
  viewer?: {
    repositories: {
      nodes: RepoNode[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  };
  organization?: {
    repositories: {
      nodes: RepoNode[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  };
}

interface RepoConnection {
  nodes: RepoNode[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

function createOctokit(token: string) {
  return new Octokit({ auth: token });
}

function transformRepo(node: RepoNode, viewerLogin: string): Repository {
  const ownerLogin = node.owner.login;
  const parentFullName = node.parent?.nameWithOwner;
  return {
    id: String(node.databaseId),
    name: node.name,
    full_name: node.nameWithOwner,
    description: node.description ?? undefined,
    html_url: node.url,
    updated_at: node.updatedAt,
    is_fork: node.isFork,
    parent_full_name: parentFullName ?? undefined,
    is_private: node.isPrivate,
    is_own_repo: Boolean(viewerLogin && ownerLogin === viewerLogin),
    stargazers_count: node.stargazerCount,
    open_issues_count: node.issues.totalCount,
    open_prs_count: node.pullRequests.totalCount,
  };
}

function getRepoSortOrder(sort: Preferences.BrowserRepository['sort']) {
  if (sort !== 'updated_at') return undefined;

  return { field: 'UPDATED_AT', direction: 'DESC' };
}

const REPO_FIELDS = `
  databaseId
  name
  nameWithOwner
  description
  url
  updatedAt
  isFork
  isPrivate
  stargazerCount
  forkCount
  issues(states: OPEN) { totalCount }
  pullRequests(states: OPEN) { totalCount }
  owner { login }
  parent { nameWithOwner }
`;

const USER_REPOS_QUERY = `query($cursor: String, $orderBy: RepositoryOrder) {
  viewer {
    repositories(first: 100, after: $cursor, affiliations: [OWNER, COLLABORATOR], orderBy: $orderBy) {
      pageInfo { hasNextPage endCursor }
      nodes { ${REPO_FIELDS} }
    }
  }
}`;

const ORG_REPOS_QUERY = `query($org: String!, $cursor: String, $orderBy: RepositoryOrder) {
  organization(login: $org) {
    repositories(first: 100, after: $cursor, orderBy: $orderBy) {
      pageInfo { hasNextPage endCursor }
      nodes { ${REPO_FIELDS} }
    }
  }
}`;

const ORGS_QUERY = `query {
  viewer {
    login
    organizations(first: 100) {
      nodes { login }
    }
  }
}`;

export async function fetchAllRepos(token: string, sort: Preferences.BrowserRepository['sort']): Promise<Repository[]> {
  const octokit = createOctokit(token);
  const seen = new Set<string>();
  const repos: Repository[] = [];
  const repoSortOrder = getRepoSortOrder(sort);

  const orgsData = await octokit.graphql<OrgsQueryResult>(ORGS_QUERY);
  const viewerLogin: string = orgsData.viewer.login ?? '';
  const orgs: string[] = orgsData.viewer.organizations.nodes.map(n => n.login);

  function addRepos(nodes: RepoNode[]) {
    for (const node of nodes) {
      const repo = transformRepo(node, viewerLogin);
      if (!seen.has(repo.full_name)) {
        seen.add(repo.full_name);
        repos.push(repo);
      }
    }
  }

  let cursor: string | null = null;
  while (true) {
    const data = await octokit.graphql<ReposQueryResult>(USER_REPOS_QUERY, {
      cursor,
      orderBy: repoSortOrder,
    });
    const repositories: RepoConnection = data.viewer?.repositories ?? {
      nodes: [],
      pageInfo: { hasNextPage: false, endCursor: null },
    };
    const { nodes, pageInfo } = repositories;
    addRepos(nodes);
    if (!pageInfo.hasNextPage) break;
    cursor = pageInfo.endCursor;
  }

  for (const org of orgs) {
    cursor = null;
    while (true) {
      const data = await octokit.graphql<ReposQueryResult>(ORG_REPOS_QUERY, {
        org,
        cursor,
        orderBy: repoSortOrder,
      });
      const repositories: RepoConnection = data.organization?.repositories ?? {
        nodes: [],
        pageInfo: { hasNextPage: false, endCursor: null },
      };
      const { nodes, pageInfo } = repositories;
      addRepos(nodes);
      if (!pageInfo.hasNextPage) break;
      cursor = pageInfo.endCursor;
    }
  }

  return repos;
}
