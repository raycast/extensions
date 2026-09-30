import { gql } from "@apollo/client";
import { getGitLabGQL, gitlab } from "../../common";
import { getIdFromGqlId } from "../../utils";
import { Commit } from "./types";

const MR_COMMITS_PAGE_SIZE = 20;

const COMMIT_LIST_FIELDS = gql`
  fragment CommitListFields on Commit {
    sha
    title
    message
    authorName
    authorEmail
    authoredDate
    webUrl
    author {
      avatarUrl
    }
    pipelines(first: 1) {
      nodes {
        id
        iid
        status
        detailedStatus {
          label
          name
        }
      }
    }
  }
`;

const MR_COMMITS = gql`
  ${COMMIT_LIST_FIELDS}
  query MergeRequestCommits($fullPath: ID!, $iid: String!, $first: Int!, $after: String) {
    project(fullPath: $fullPath) {
      mergeRequest(iid: $iid) {
        commits(first: $first, after: $after) {
          nodes {
            ...CommitListFields
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`;

const PROJECT_COMMITS = gql`
  ${COMMIT_LIST_FIELDS}
  query ProjectCommits($fullPath: ID!, $ref: String!, $first: Int!, $after: String) {
    project(fullPath: $fullPath) {
      repository {
        commits(ref: $ref, first: $first, after: $after) {
          nodes {
            ...CommitListFields
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`;

interface GqlPipelineNode {
  id: string;
  iid: string;
  status: string;
  detailedStatus?: { label?: string | null; name?: string | null } | null;
}

interface GqlCommitNode {
  sha: string;
  title: string;
  message?: string | null;
  authorName?: string | null;
  authorEmail?: string | null;
  authoredDate: string;
  webUrl: string;
  author?: { avatarUrl?: string | null } | null;
  pipelines?: { nodes: GqlPipelineNode[] } | null;
}

interface GqlCommitConnection {
  nodes: GqlCommitNode[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor?: string | null;
  };
}

const endCursorsByCacheKey = new Map<string, string[]>();
const projectCommitEndCursorsByCacheKey = new Map<string, string[]>();

export function resetProjectCommitsGqlCursors(cacheKey: string): void {
  projectCommitEndCursorsByCacheKey.delete(cacheKey);
}

function resolveAvatarUrl(avatarUrl: string | null | undefined): string | undefined {
  if (!avatarUrl) {
    return undefined;
  }
  if (/^https?:\/\//i.test(avatarUrl)) {
    return avatarUrl;
  }
  return gitlab.joinUrl(avatarUrl);
}

function pipelineStatusToRest(status: string | undefined): string | undefined {
  if (!status) {
    return undefined;
  }
  return status.toLowerCase();
}

function pipelineStatusFromGql(pipeline: GqlPipelineNode | null | undefined): string | undefined {
  if (!pipeline) {
    return undefined;
  }
  const fromStatus = pipelineStatusToRest(pipeline.status);
  if (fromStatus) {
    return fromStatus;
  }
  if (pipeline.detailedStatus?.name) {
    return pipelineStatusToRest(pipeline.detailedStatus.name);
  }
  if (pipeline.detailedStatus?.label) {
    return pipelineStatusToRest(pipeline.detailedStatus.label);
  }
  return undefined;
}

function gqlCommitToCommit(node: GqlCommitNode): Commit {
  const pipeline = node.pipelines?.nodes?.[0];
  return {
    id: node.sha,
    title: node.title,
    created_at: node.authoredDate,
    message: node.message ?? "",
    author_name: node.authorName ?? "",
    author_email: node.authorEmail ?? undefined,
    web_url: node.webUrl,
    author_avatar_url: resolveAvatarUrl(node.author?.avatarUrl),
    pipeline_status: pipelineStatusFromGql(pipeline),
    head_pipeline:
      pipeline?.id && pipeline?.iid ? { id: getIdFromGqlId(pipeline.id), iid: `${pipeline.iid}` } : undefined,
  };
}

async function queryMRCommitsConnection(
  projectFullPath: string,
  mrIID: number,
  variables: { first: number; after?: string },
): Promise<GqlCommitConnection> {
  const response = await getGitLabGQL().client.query({
    query: MR_COMMITS,
    variables: {
      fullPath: projectFullPath,
      iid: `${mrIID}`,
      first: variables.first,
      after: variables.after,
    },
  });
  const connection = response.data?.project?.mergeRequest?.commits as GqlCommitConnection | undefined;
  if (!connection) {
    throw new Error("Could not load merge request commits");
  }
  return connection;
}

export async function fetchMRCommitsGqlPage(options: {
  cacheKey: string;
  page: number;
  projectFullPath: string;
  mrIID: number;
}): Promise<{ commits: Commit[]; hasMore: boolean }> {
  const { cacheKey, page, projectFullPath, mrIID } = options;

  if (!endCursorsByCacheKey.has(cacheKey)) {
    endCursorsByCacheKey.set(cacheKey, []);
  }
  const cursors = endCursorsByCacheKey.get(cacheKey)!;

  if (page === 0) {
    cursors.length = 0;
  }

  if (page > 0 && cursors.length < page) {
    for (let index = cursors.length; index < page; index += 1) {
      const after = index === 0 ? undefined : cursors[index - 1];
      const connection = await queryMRCommitsConnection(projectFullPath, mrIID, {
        first: MR_COMMITS_PAGE_SIZE,
        after,
      });
      cursors[index] = connection.pageInfo.endCursor ?? "";
      if (!connection.pageInfo.hasNextPage) {
        return { commits: [], hasMore: false };
      }
    }
  }

  const after = page > 0 ? cursors[page - 1] : undefined;
  const connection = await queryMRCommitsConnection(projectFullPath, mrIID, {
    first: MR_COMMITS_PAGE_SIZE,
    after,
  });
  cursors[page] = connection.pageInfo.endCursor ?? "";

  return {
    commits: connection.nodes.map(gqlCommitToCommit),
    hasMore: connection.pageInfo.hasNextPage,
  };
}

async function queryProjectCommitsConnection(
  projectFullPath: string,
  ref: string,
  variables: { first: number; after?: string },
): Promise<GqlCommitConnection> {
  const response = await getGitLabGQL().client.query({
    query: PROJECT_COMMITS,
    variables: {
      fullPath: projectFullPath,
      ref,
      first: variables.first,
      after: variables.after,
    },
  });
  const connection = response.data?.project?.repository?.commits as GqlCommitConnection | undefined;
  if (!connection) {
    throw new Error("Could not load project commits");
  }
  return connection;
}

export async function fetchProjectCommitsGqlPage(options: {
  cacheKey: string;
  page: number;
  projectFullPath: string;
  ref: string;
}): Promise<{ commits: Commit[]; hasMore: boolean }> {
  const { cacheKey, page, projectFullPath, ref } = options;

  if (!projectCommitEndCursorsByCacheKey.has(cacheKey)) {
    projectCommitEndCursorsByCacheKey.set(cacheKey, []);
  }
  const cursors = projectCommitEndCursorsByCacheKey.get(cacheKey)!;

  if (page === 0) {
    cursors.length = 0;
  }

  if (page > 0 && cursors.length < page) {
    for (let index = cursors.length; index < page; index += 1) {
      const after = index === 0 ? undefined : cursors[index - 1];
      const connection = await queryProjectCommitsConnection(projectFullPath, ref, {
        first: MR_COMMITS_PAGE_SIZE,
        after,
      });
      cursors[index] = connection.pageInfo.endCursor ?? "";
      if (!connection.pageInfo.hasNextPage) {
        return { commits: [], hasMore: false };
      }
    }
  }

  const after = page > 0 ? cursors[page - 1] : undefined;
  const connection = await queryProjectCommitsConnection(projectFullPath, ref, {
    first: MR_COMMITS_PAGE_SIZE,
    after,
  });
  cursors[page] = connection.pageInfo.endCursor ?? "";

  return {
    commits: connection.nodes.map(gqlCommitToCommit),
    hasMore: connection.pageInfo.hasNextPage,
  };
}
