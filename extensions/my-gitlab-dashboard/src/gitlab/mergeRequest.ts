import { AsyncState, useFetch } from "@raycast/utils";
import fetch from "node-fetch";
import { Jira, checkStatusCode, tryExtractJira, graphQlEndpoint, headers } from "./common";
import { Pipeline, convertToPipeline, PIPELINE_FRAGMENT, PipelineApi } from "./pipeline";
import { User, enrichUser } from "./user";
import { lastMrUpdateTimes } from "../storage";
import dayjs from "dayjs";

export interface MergeRequest {
  project: {
    fullPath: string;
  };
  id: string;
  iid: string;
  title: string;
  sha: string;
  state: MergeRequestState;
  draft: boolean;
  createdAt: string;
  updatedAt: string;
  hasUpdates: boolean;
  hasConflicts: boolean;
  webUrl: string;
  sourceBranch: string;
  jira?: Jira;
  author: User;
  comments: Comment[];
  unresolvedCommentsCount: number;
  hasComments: boolean;
  approvedBy: User[];
  hasApprovers: boolean;
  mergedBy?: User;
  latestPipeline?: Pipeline;
}

export type MergeRequestState = "opened" | "closed" | "locked" | "merged";

type MergeRequestApi = MergeRequest & {
  diffHeadSha: string;
  conflicts: boolean;
  approvedBy: {
    nodes: User[];
  };
  mergeUser: User;
  pipelines: {
    nodes: PipelineApi[];
  };
  notes: {
    nodes: CommentApi[];
  };
};

export interface Comment {
  id: string;
  body: string;
  author: User;
  updatedAt: string;
  isUnresolved: boolean;
  webUrl: string;
}

type CommentApi = Comment & {
  system: boolean;
  resolvable: boolean;
  resolved: boolean;
  url: string;
};

export class MergeRequestCannotBeMergedError extends Error {}

const LIST_MERGE_REQUESTS_QUERY = `
${PIPELINE_FRAGMENT}
query ListMergeRequests($project: ID!, $state: MergeRequestState = opened, $mergedAfter: Time) {
    project(fullPath: $project) {
        mergeRequests(state: $state, mergedAfter: $mergedAfter) {
            nodes {
                id
                iid
                title
                diffHeadSha
                state
                draft
                createdAt
                updatedAt
                conflicts
                webUrl
                sourceBranch
                author {
                    name
                    username
                }
                notes {
                    nodes {
                        id
                        author {
                            name
                            username
                        }
                        body
                        system
                        updatedAt
                        resolvable
                        resolved
                        url
                    }
                }
                project {
                    fullPath
                }
                approvedBy {
                    nodes {
                        name
                        username
                    }
                }
                mergeUser {
                    name
                    username
                }
                pipelines(first: 1) {
                    nodes {
                        ...PipelineParts
                    }
                }
            }
        }
    }
}
`;

const MERGE_REQUEST_SET_DRAFT_MUTATION = `
mutation MergeRequestSetDraftMutation($project: ID!, $mrId: String!, $draft: Boolean!) {
    mergeRequestSetDraft(input: { 
        projectPath: $project, 
        iid: $mrId, 
        draft: $draft 
    }) {
        errors
    }
}
`;

const MERGE_REQUEST_ACCEPT_MUTATION = `
mutation MergeRequestAcceptMutation($project: ID!, $mrId: String!, $sha: String!) {
    mergeRequestAccept(input: { 
        projectPath: $project, 
        iid: $mrId,
        sha: $sha
    }) {
        errors
    }
}
`;

export function markAsReady(mr: MergeRequest): Promise<void> {
  return fetch(graphQlEndpoint, {
    headers,
    method: "post",
    body: JSON.stringify({
      query: MERGE_REQUEST_SET_DRAFT_MUTATION,
      variables: {
        project: mr.project.fullPath,
        mrId: mr.iid,
        draft: false,
      },
    }),
  })
    .then(checkStatusCode)
    .then(() => {
      return;
    });
}

export function markAsDraft(mr: MergeRequest): Promise<void> {
  return fetch(graphQlEndpoint, {
    headers,
    method: "post",
    body: JSON.stringify({
      query: MERGE_REQUEST_SET_DRAFT_MUTATION,
      variables: {
        project: mr.project.fullPath,
        mrId: mr.iid,
        draft: true,
      },
    }),
  })
    .then(checkStatusCode)
    .then(() => {
      return;
    });
}

export function merge(mr: MergeRequest): Promise<void> {
  return fetch(graphQlEndpoint, {
    headers,
    method: "post",
    body: JSON.stringify({
      query: MERGE_REQUEST_ACCEPT_MUTATION,
      variables: {
        project: mr.project.fullPath,
        mrId: mr.iid,
        sha: mr.sha,
      },
    }),
  })
    .then(checkStatusCode)
    .then((res) => res.json())
    .then((data) => {
      const errors = data.data.mergeRequestAccept.errors;
      if (errors.length > 0) {
        throw new MergeRequestCannotBeMergedError(errors[0]);
      }
    });
}

export function allOpenMergeRequests(projectFullPath: string): AsyncState<MergeRequest[]> {
  return useFetch<MergeRequest[]>(graphQlEndpoint, {
    headers,
    method: "post",
    body: JSON.stringify({
      query: LIST_MERGE_REQUESTS_QUERY,
      variables: {
        project: projectFullPath,
      },
    }),
    parseResponse: async (res) => {
      const data = await checkStatusCode(res).json();
      const mergeRequests = data.data.project.mergeRequests.nodes;
      return await convertToMergeRequests(mergeRequests);
    },
  });
}

export function allMergedMergeRequestsToday(projectFullPath: string): AsyncState<MergeRequest[]> {
  function todayAtMidnightIso(): string {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return today.toISOString();
  }

  return useFetch<MergeRequest[]>(graphQlEndpoint, {
    headers,
    method: "post",
    body: JSON.stringify({
      query: LIST_MERGE_REQUESTS_QUERY,
      variables: {
        project: projectFullPath,
        state: "merged",
        mergedAfter: todayAtMidnightIso(),
      },
    }),
    parseResponse: async (res) => {
      const data = await checkStatusCode(res).json();
      const mergeRequests = data.data.project.mergeRequests.nodes;
      return convertToMergeRequests(mergeRequests);
    },
  });
}

async function convertToMergeRequests(mergeRequestsResponse: MergeRequestApi[]): Promise<MergeRequest[]> {
  function convertToComment(comment: CommentApi) {
    return {
      ...comment,
      isUnresolved: comment.resolvable && !comment.resolved,
      webUrl: comment.url,
    };
  }

  const lastUpdateTimes = await lastMrUpdateTimes();

  const mrs = mergeRequestsResponse.map((mr) => ({
    ...mr,
    sha: mr.diffHeadSha,
    hasConflicts: mr.conflicts,
    hasUpdates: lastUpdateTimes.get(mr.id)?.isBefore(dayjs(mr.updatedAt), "second") ?? false,
    jira: tryExtractJira(mr.title),
    approvedBy: mr.approvedBy.nodes,
    mergedBy: mr.mergeUser,
    latestPipeline: mr.pipelines.nodes.length > 0 ? convertToPipeline(mr.pipelines.nodes[0]) : undefined,
    comments: mr.notes.nodes.filter((c) => !c.system).map(convertToComment),
  }));
  mrs.forEach((mr) => (mr.hasComments = mr.comments.length > 0));
  mrs.forEach((mr) => (mr.hasApprovers = mr.approvedBy.length > 0));
  mrs.forEach((mr) => (mr.unresolvedCommentsCount = mr.comments.filter((c) => c.isUnresolved).length));
  await Promise.all(
    [
      ...mrs.map((mr) => mr.author),
      ...mrs.flatMap((mr) => mr.approvedBy),
      ...mrs.filter((mr) => mr.mergedBy).map((mr) => mr.mergedBy),
      ...mrs.flatMap((mr) => mr.comments).map((c) => c.author),
    ].map(enrichUser),
  );
  return mrs;
}
