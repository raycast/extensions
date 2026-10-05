import { gql } from "@apollo/client";
import { getGitLabGQL, gitlab } from "../common";
import { Pipeline, User } from "../gitlabapi";
import { getIdFromGqlId } from "../utils";

export const PIPELINE_LIST_PAGE_SIZE = 20;

/* eslint-disable @typescript-eslint/no-explicit-any */

export function normalizePipelineForList(data: Record<string, any>): Pipeline {
  const pipeline = new Pipeline();
  pipeline.id = data.id;
  pipeline.iid = `${data.iid}`;
  pipeline.projectId = `${data.project_id}`;
  pipeline.status = data.status ?? "";
  pipeline.ref = data.ref ?? "";
  pipeline.sha = data.sha ?? "";
  pipeline.webUrl = data.web_url ?? data.webUrl ?? "";
  pipeline.created_at = data.created_at ?? data.createdAt ?? "";
  pipeline.updated_at = data.updated_at ?? data.updatedAt ?? "";
  pipeline.started_at = data.started_at ?? data.startedAt ?? "";
  pipeline.finished_at = data.finished_at ?? data.finishedAt ?? "";
  pipeline.duration = data.duration ?? 0;
  pipeline.commit_title = data.commit_title ?? data.commitTitle ?? data.name ?? "";
  if (data.user?.name || data.user?.username) {
    const user = new User();
    user.name = data.user.name ?? "";
    user.username = data.user.username ?? "";
    pipeline.user = user;
  }
  return pipeline;
}

const PIPELINE_LIST_FIELDS = gql`
  fragment PipelineListFields on Pipeline {
    id
    iid
    project {
      id
    }
    status
    path
    ref
    name
    startedAt
    createdAt
    finishedAt
    user {
      name
      username
    }
  }
`;

const PROJECT_PIPELINES = gql`
  ${PIPELINE_LIST_FIELDS}
  query ProjectPipelines($fullPath: ID!, $first: Int!, $after: String) {
    project(fullPath: $fullPath) {
      pipelines(first: $first, after: $after) {
        nodes {
          ...PipelineListFields
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const PIPELINE_FOR_COMMIT = gql`
  query PipelineForCommit($fullPath: ID!, $sha: String!) {
    project(fullPath: $fullPath) {
      pipelines(first: 1, sha: $sha) {
        nodes {
          iid
        }
      }
    }
  }
`;

interface GqlPipelineNode {
  id: string;
  iid: string;
  project: { id: string };
  status: string;
  path: string;
  ref: string;
  name?: string | null;
  startedAt?: string;
  createdAt: string;
  finishedAt?: string;
  user?: { name?: string | null; username?: string | null } | null;
}

interface GqlPipelineConnection {
  nodes: GqlPipelineNode[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor?: string | null;
  };
}

const endCursorsByCacheKey = new Map<string, string[]>();

export function resetPipelineListGqlCursors(cacheKey: string): void {
  endCursorsByCacheKey.delete(cacheKey);
}

function gqlPipelineToPipeline(node: GqlPipelineNode): Pipeline {
  return normalizePipelineForList({
    id: getIdFromGqlId(node.id),
    iid: node.iid,
    project_id: getIdFromGqlId(node.project.id),
    status: node.status.toLowerCase(),
    ref: node.ref,
    web_url: `${getGitLabGQL().url}${node.path}`,
    created_at: node.createdAt,
    started_at: node.startedAt,
    finished_at: node.finishedAt,
    name: node.name,
    user: node.user,
  });
}

async function queryProjectPipelinesConnection(
  projectFullPath: string,
  variables: { first: number; after?: string },
): Promise<GqlPipelineConnection> {
  const response = await getGitLabGQL().client.query({
    query: PROJECT_PIPELINES,
    variables: {
      fullPath: projectFullPath,
      first: variables.first,
      after: variables.after,
    },
  });
  const connection = response.data?.project?.pipelines as GqlPipelineConnection | undefined;
  if (!connection) {
    throw new Error("Could not load pipelines");
  }
  return connection;
}

async function fetchPipelineGqlPage(options: {
  cacheKey: string;
  page: number;
  queryConnection: (variables: { first: number; after?: string }) => Promise<GqlPipelineConnection>;
}): Promise<{ pipelines: Pipeline[]; hasMore: boolean }> {
  const { cacheKey, page, queryConnection } = options;

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
      const connection = await queryConnection({
        first: PIPELINE_LIST_PAGE_SIZE,
        after,
      });
      cursors[index] = connection.pageInfo.endCursor ?? "";
      if (!connection.pageInfo.hasNextPage) {
        return { pipelines: [], hasMore: false };
      }
    }
  }

  const after = page > 0 ? cursors[page - 1] : undefined;
  const connection = await queryConnection({
    first: PIPELINE_LIST_PAGE_SIZE,
    after,
  });
  cursors[page] = connection.pageInfo.endCursor ?? "";

  return {
    pipelines: connection.nodes.map(gqlPipelineToPipeline),
    hasMore: connection.pageInfo.hasNextPage,
  };
}

export async function fetchProjectPipelinesGqlPage(options: {
  cacheKey: string;
  page: number;
  projectFullPath: string;
}): Promise<{ pipelines: Pipeline[]; hasMore: boolean }> {
  const { cacheKey, page, projectFullPath } = options;
  return fetchPipelineGqlPage({
    cacheKey,
    page,
    queryConnection: (variables) => queryProjectPipelinesConnection(projectFullPath, variables),
  });
}

interface RestMrPipelineJson {
  id: number;
  iid: number;
  project_id: number;
  sha?: string;
  ref: string;
  status: string;
  web_url: string;
  created_at?: string;
  updated_at?: string;
}

export async function fetchMRPipelinesPage(options: {
  page: number;
  projectId: number;
  mrIID: number;
}): Promise<{ pipelines: Pipeline[]; hasMore: boolean }> {
  const { data, hasMore } = await gitlab.fetchPaged(
    `projects/${options.projectId}/merge_requests/${options.mrIID}/pipelines`,
    {},
    options.page + 1,
    PIPELINE_LIST_PAGE_SIZE,
  );
  const pipelines = ((data as RestMrPipelineJson[]) ?? []).map((pipeline) =>
    normalizePipelineForList({
      id: pipeline.id,
      iid: pipeline.iid,
      project_id: pipeline.project_id,
      status: pipeline.status,
      ref: pipeline.ref,
      sha: pipeline.sha,
      web_url: pipeline.web_url,
      created_at: pipeline.created_at,
      updated_at: pipeline.updated_at,
    }),
  );
  return { pipelines, hasMore };
}

export async function fetchLatestPipelineIidByCommitShaGql(
  projectFullPath: string,
  sha: string,
): Promise<string | undefined> {
  const response = await getGitLabGQL().client.query({
    query: PIPELINE_FOR_COMMIT,
    variables: { fullPath: projectFullPath, sha },
  });
  const iid = response.data?.project?.pipelines?.nodes?.[0]?.iid as string | number | undefined;
  return iid !== undefined ? `${iid}` : undefined;
}
