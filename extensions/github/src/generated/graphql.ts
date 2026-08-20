/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
import type * as Types from "./schema";

import { GraphQLClient, RequestOptions } from "graphql-request";
import gql from "graphql-tag";
type GraphQLClientRequestHeaders = RequestOptions["requestHeaders"];
export type CreateLinkedBranchMutationVariables = Exact<{
  input: Types.CreateLinkedBranchInput;
}>;

export type CreateLinkedBranchMutation = {
  createLinkedBranch: {
    clientMutationId: string | null;
    linkedBranch: { ref: { id: string; name: string } | null } | null;
  } | null;
};

export type CreateRefMutationVariables = Exact<{
  input: Types.CreateRefInput;
}>;

export type CreateRefMutation = {
  createRef: { clientMutationId: string | null; ref: { id: string; name: string } | null } | null;
};

export type DeleteLinkedBranchMutationVariables = Exact<{
  input: Types.DeleteLinkedBranchInput;
}>;

export type DeleteLinkedBranchMutation = { deleteLinkedBranch: { clientMutationId: string | null } | null };

export type DiscussionFieldsFragment = {
  id: string;
  title: string;
  bodyText: string;
  publishedAt: any;
  url: any;
  upvoteCount: number;
  repository: {
    id: string;
    nameWithOwner: string;
    name: string;
    url: any;
    mergeCommitAllowed: boolean;
    squashMergeAllowed: boolean;
    rebaseMergeAllowed: boolean;
    autoMergeAllowed: boolean;
    defaultBranchRef: { target: { oid: any } | { oid: any } | { oid: any } | { oid: any } | null } | null;
    owner: { login: string; avatarUrl: any } | { login: string; avatarUrl: any };
  };
  category: { name: string; emoji: string; emojiHTML: any };
  comments: { totalCount: number };
  answer: { bodyText: string } | null;
  author:
    | { login: string; avatarUrl: any }
    | { login: string; avatarUrl: any }
    | { login: string; avatarUrl: any }
    | { login: string; avatarUrl: any }
    | { login: string; avatarUrl: any }
    | null;
};

export type SearchDiscussionsQueryVariables = Exact<{
  query: string;
  numberOfOpenItems: number;
}>;

export type SearchDiscussionsQuery = {
  openDiscussions: {
    nodes: Array<
      | {
          id: string;
          title: string;
          bodyText: string;
          publishedAt: any;
          url: any;
          upvoteCount: number;
          repository: {
            id: string;
            nameWithOwner: string;
            name: string;
            url: any;
            mergeCommitAllowed: boolean;
            squashMergeAllowed: boolean;
            rebaseMergeAllowed: boolean;
            autoMergeAllowed: boolean;
            defaultBranchRef: { target: { oid: any } | { oid: any } | { oid: any } | { oid: any } | null } | null;
            owner: { login: string; avatarUrl: any } | { login: string; avatarUrl: any };
          };
          category: { name: string; emoji: string; emojiHTML: any };
          comments: { totalCount: number };
          answer: { bodyText: string } | null;
          author:
            | { login: string; avatarUrl: any }
            | { login: string; avatarUrl: any }
            | { login: string; avatarUrl: any }
            | { login: string; avatarUrl: any }
            | { login: string; avatarUrl: any }
            | null;
        }
      | Record<PropertyKey, never>
      | null
    > | null;
  };
  searchDiscussions: {
    nodes: Array<
      | {
          id: string;
          title: string;
          bodyText: string;
          publishedAt: any;
          url: any;
          upvoteCount: number;
          repository: {
            id: string;
            nameWithOwner: string;
            name: string;
            url: any;
            mergeCommitAllowed: boolean;
            squashMergeAllowed: boolean;
            rebaseMergeAllowed: boolean;
            autoMergeAllowed: boolean;
            defaultBranchRef: { target: { oid: any } | { oid: any } | { oid: any } | { oid: any } | null } | null;
            owner: { login: string; avatarUrl: any } | { login: string; avatarUrl: any };
          };
          category: { name: string; emoji: string; emojiHTML: any };
          comments: { totalCount: number };
          answer: { bodyText: string } | null;
          author:
            | { login: string; avatarUrl: any }
            | { login: string; avatarUrl: any }
            | { login: string; avatarUrl: any }
            | { login: string; avatarUrl: any }
            | { login: string; avatarUrl: any }
            | null;
        }
      | Record<PropertyKey, never>
      | null
    > | null;
  };
};

export type GetGitHubDiscussionNumberQueryVariables = Exact<{
  filter: string;
}>;

export type GetGitHubDiscussionNumberQuery = {
  search: { nodes: Array<{ number: number; url: any } | Record<PropertyKey, never> | null> | null };
};

export type IssueFieldsFragment = {
  id: string;
  url: any;
  title: string;
  number: number;
  closed: boolean;
  state: Types.IssueState;
  stateReason: Types.IssueStateReason | null;
  updatedAt: any;
  author:
    | { id: string; login: string; avatarUrl: any }
    | { id: string; login: string; name: string | null; avatarUrl: any }
    | { id: string; login: string; avatarUrl: any }
    | { id: string; login: string; name: string | null; avatarUrl: any }
    | { id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean }
    | null;
  linkedBranches: {
    totalCount: number;
    nodes: Array<{ id: string; ref: { id: string; name: string } | null } | null> | null;
  };
  milestone: { id: string; title: string } | null;
  repository: {
    id: string;
    nameWithOwner: string;
    name: string;
    url: any;
    mergeCommitAllowed: boolean;
    squashMergeAllowed: boolean;
    rebaseMergeAllowed: boolean;
    autoMergeAllowed: boolean;
    defaultBranchRef: { target: { oid: any } | { oid: any } | { oid: any } | { oid: any } | null } | null;
    owner: { login: string; avatarUrl: any } | { login: string; avatarUrl: any };
  };
  comments: { totalCount: number };
  assignees: {
    totalCount: number;
    nodes: Array<{ id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean } | null> | null;
  };
};

export type RepositoryCollaboratorsForIssuesQueryVariables = Exact<{
  owner: string;
  name: string;
  issueNumber: number;
}>;

export type RepositoryCollaboratorsForIssuesQuery = {
  repository: {
    collaborators: {
      totalCount: number;
      nodes: Array<{ id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean } | null> | null;
    } | null;
    issue: { assignees: { totalCount: number; nodes: Array<{ id: string } | null> | null } } | null;
  } | null;
};

export type RepositoryProjectsForIssuesQueryVariables = Exact<{
  owner: string;
  name: string;
  issueNumber: number;
}>;

export type RepositoryProjectsForIssuesQuery = {
  repository: {
    projectsV2: { totalCount: number; nodes: Array<{ id: string; title: string; number: number } | null> | null };
    issue: { projectsV2: { totalCount: number; nodes: Array<{ id: string } | null> | null } } | null;
  } | null;
};

export type IssueDetailFieldsFragment = {
  id: string;
  url: any;
  title: string;
  body: string;
  number: number;
  closed: boolean;
  state: Types.IssueState;
  stateReason: Types.IssueStateReason | null;
  updatedAt: any;
  author:
    | { id: string; login: string; avatarUrl: any }
    | { id: string; login: string; name: string | null; avatarUrl: any }
    | { id: string; login: string; avatarUrl: any }
    | { id: string; login: string; name: string | null; avatarUrl: any }
    | { id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean }
    | null;
  labels: {
    totalCount: number;
    nodes: Array<{ id: string; name: string; color: string; isDefault: boolean } | null> | null;
  } | null;
  linkedBranches: { totalCount: number; nodes: Array<{ id: string; ref: { name: string } | null } | null> | null };
  milestone: { id: string; title: string } | null;
  repository: {
    id: string;
    nameWithOwner: string;
    name: string;
    url: any;
    mergeCommitAllowed: boolean;
    squashMergeAllowed: boolean;
    rebaseMergeAllowed: boolean;
    autoMergeAllowed: boolean;
    defaultBranchRef: { target: { oid: any } | { oid: any } | { oid: any } | { oid: any } | null } | null;
    owner: { login: string; avatarUrl: any } | { login: string; avatarUrl: any };
  };
  assignees: {
    totalCount: number;
    nodes: Array<{ id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean } | null> | null;
  };
  projectsV2: { totalCount: number; nodes: Array<{ id: string; title: string } | null> | null };
};

export type IssueDetailsQueryVariables = Exact<{
  nodeId: string | number;
}>;

export type IssueDetailsQuery = {
  node:
    | {
        id: string;
        url: any;
        title: string;
        body: string;
        number: number;
        closed: boolean;
        state: Types.IssueState;
        stateReason: Types.IssueStateReason | null;
        updatedAt: any;
        author:
          | { id: string; login: string; avatarUrl: any }
          | { id: string; login: string; name: string | null; avatarUrl: any }
          | { id: string; login: string; avatarUrl: any }
          | { id: string; login: string; name: string | null; avatarUrl: any }
          | { id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean }
          | null;
        labels: {
          totalCount: number;
          nodes: Array<{ id: string; name: string; color: string; isDefault: boolean } | null> | null;
        } | null;
        linkedBranches: {
          totalCount: number;
          nodes: Array<{ id: string; ref: { name: string } | null } | null> | null;
        };
        milestone: { id: string; title: string } | null;
        repository: {
          id: string;
          nameWithOwner: string;
          name: string;
          url: any;
          mergeCommitAllowed: boolean;
          squashMergeAllowed: boolean;
          rebaseMergeAllowed: boolean;
          autoMergeAllowed: boolean;
          defaultBranchRef: { target: { oid: any } | { oid: any } | { oid: any } | { oid: any } | null } | null;
          owner: { login: string; avatarUrl: any } | { login: string; avatarUrl: any };
        };
        assignees: {
          totalCount: number;
          nodes: Array<{
            id: string;
            avatarUrl: any;
            name: string | null;
            login: string;
            isViewer: boolean;
          } | null> | null;
        };
        projectsV2: { totalCount: number; nodes: Array<{ id: string; title: string } | null> | null };
      }
    | Record<PropertyKey, never>
    | null;
};

export type SearchIssuesQueryVariables = Exact<{
  query: string;
  numberOfItems: number;
}>;

export type SearchIssuesQuery = {
  search: {
    nodes: Array<
      | {
          id: string;
          url: any;
          title: string;
          number: number;
          closed: boolean;
          state: Types.IssueState;
          stateReason: Types.IssueStateReason | null;
          updatedAt: any;
          author:
            | { id: string; login: string; avatarUrl: any }
            | { id: string; login: string; name: string | null; avatarUrl: any }
            | { id: string; login: string; avatarUrl: any }
            | { id: string; login: string; name: string | null; avatarUrl: any }
            | { id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean }
            | null;
          linkedBranches: {
            totalCount: number;
            nodes: Array<{ id: string; ref: { id: string; name: string } | null } | null> | null;
          };
          milestone: { id: string; title: string } | null;
          repository: {
            id: string;
            nameWithOwner: string;
            name: string;
            url: any;
            mergeCommitAllowed: boolean;
            squashMergeAllowed: boolean;
            rebaseMergeAllowed: boolean;
            autoMergeAllowed: boolean;
            defaultBranchRef: { target: { oid: any } | { oid: any } | { oid: any } | { oid: any } | null } | null;
            owner: { login: string; avatarUrl: any } | { login: string; avatarUrl: any };
          };
          comments: { totalCount: number };
          assignees: {
            totalCount: number;
            nodes: Array<{
              id: string;
              avatarUrl: any;
              name: string | null;
              login: string;
              isViewer: boolean;
            } | null> | null;
          };
        }
      | Record<PropertyKey, never>
      | null
    > | null;
  };
};

export type IssueByNumberQueryVariables = Exact<{
  owner: string;
  name: string;
  issueNumber: number;
}>;

export type IssueByNumberQuery = {
  repository: {
    issue: {
      id: string;
      url: any;
      title: string;
      number: number;
      closed: boolean;
      state: Types.IssueState;
      stateReason: Types.IssueStateReason | null;
      updatedAt: any;
      author:
        | { id: string; login: string; avatarUrl: any }
        | { id: string; login: string; name: string | null; avatarUrl: any }
        | { id: string; login: string; avatarUrl: any }
        | { id: string; login: string; name: string | null; avatarUrl: any }
        | { id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean }
        | null;
      linkedBranches: {
        totalCount: number;
        nodes: Array<{ id: string; ref: { id: string; name: string } | null } | null> | null;
      };
      milestone: { id: string; title: string } | null;
      repository: {
        id: string;
        nameWithOwner: string;
        name: string;
        url: any;
        mergeCommitAllowed: boolean;
        squashMergeAllowed: boolean;
        rebaseMergeAllowed: boolean;
        autoMergeAllowed: boolean;
        defaultBranchRef: { target: { oid: any } | { oid: any } | { oid: any } | { oid: any } | null } | null;
        owner: { login: string; avatarUrl: any } | { login: string; avatarUrl: any };
      };
      comments: { totalCount: number };
      assignees: {
        totalCount: number;
        nodes: Array<{
          id: string;
          avatarUrl: any;
          name: string | null;
          login: string;
          isViewer: boolean;
        } | null> | null;
      };
    } | null;
  } | null;
};

export type CloseIssueMutationVariables = Exact<{
  nodeId: string | number;
  stateReason: Types.IssueClosedStateReason;
}>;

export type CloseIssueMutation = { closeIssue: { issue: { id: string } | null } | null };

export type ReopenIssueMutationVariables = Exact<{
  nodeId: string | number;
}>;

export type ReopenIssueMutation = { reopenIssue: { issue: { id: string } | null } | null };

export type ChangeIssueAssigneesMutationVariables = Exact<{
  issueId: string | number;
  assigneeIds?: Array<string | number> | string | number | null | undefined;
}>;

export type ChangeIssueAssigneesMutation = { updateIssue: { clientMutationId: string | null } | null };

export type ChangeIssueMilestoneMutationVariables = Exact<{
  issueId: string | number;
  milestoneId?: string | number | null | undefined;
}>;

export type ChangeIssueMilestoneMutation = { updateIssue: { clientMutationId: string | null } | null };

export type AddIssueToProjectMutationVariables = Exact<{
  issueId: string | number;
  projectId: string | number;
}>;

export type AddIssueToProjectMutation = { addProjectV2ItemById: { clientMutationId: string | null } | null };

export type CreateIssueMutationVariables = Exact<{
  repositoryId: string | number;
  title: string;
  body: string;
  assigneeIds: Array<string | number> | string | number;
  labelIds: Array<string | number> | string | number;
  milestoneId?: string | number | null | undefined;
  issueTypeId?: string | number | null | undefined;
}>;

export type CreateIssueMutation = {
  createIssue: {
    issue: {
      id: string;
      url: any;
      title: string;
      number: number;
      closed: boolean;
      state: Types.IssueState;
      stateReason: Types.IssueStateReason | null;
      updatedAt: any;
      author:
        | { id: string; login: string; avatarUrl: any }
        | { id: string; login: string; name: string | null; avatarUrl: any }
        | { id: string; login: string; avatarUrl: any }
        | { id: string; login: string; name: string | null; avatarUrl: any }
        | { id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean }
        | null;
      linkedBranches: {
        totalCount: number;
        nodes: Array<{ id: string; ref: { id: string; name: string } | null } | null> | null;
      };
      milestone: { id: string; title: string } | null;
      repository: {
        id: string;
        nameWithOwner: string;
        name: string;
        url: any;
        mergeCommitAllowed: boolean;
        squashMergeAllowed: boolean;
        rebaseMergeAllowed: boolean;
        autoMergeAllowed: boolean;
        defaultBranchRef: { target: { oid: any } | { oid: any } | { oid: any } | { oid: any } | null } | null;
        owner: { login: string; avatarUrl: any } | { login: string; avatarUrl: any };
      };
      comments: { totalCount: number };
      assignees: {
        totalCount: number;
        nodes: Array<{
          id: string;
          avatarUrl: any;
          name: string | null;
          login: string;
          isViewer: boolean;
        } | null> | null;
      };
    } | null;
  } | null;
};

export type ChangeProjectStatusMutationVariables = Exact<{
  projectId: string | number;
  closed: boolean;
}>;

export type ChangeProjectStatusMutation = { updateProjectV2: { clientMutationId: string | null } | null };

export type ProjectFieldsFragment = {
  id: string;
  title: string;
  public: boolean;
  number: number;
  readme: string | null;
  closed: boolean;
  shortDescription: string | null;
  url: any;
  createdAt: any;
  updatedAt: any;
  viewerCanClose: boolean;
  viewerCanUpdate: boolean;
  viewerCanReopen: boolean;
  creator:
    | { id: string; login: string; avatarUrl: any }
    | { id: string; login: string; name: string | null; avatarUrl: any }
    | { id: string; login: string; avatarUrl: any }
    | { id: string; login: string; name: string | null; avatarUrl: any }
    | { id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean }
    | null;
  views: { totalCount: number; nodes: Array<{ id: string; name: string; number: number } | null> | null };
};

export type ProjectDetailsQueryVariables = Exact<{
  nodeId: string | number;
}>;

export type ProjectDetailsQuery = {
  node:
    | {
        id: string;
        title: string;
        public: boolean;
        number: number;
        readme: string | null;
        closed: boolean;
        shortDescription: string | null;
        url: any;
        createdAt: any;
        updatedAt: any;
        viewerCanClose: boolean;
        viewerCanUpdate: boolean;
        viewerCanReopen: boolean;
        creator:
          | { id: string; login: string; avatarUrl: any }
          | { id: string; login: string; name: string | null; avatarUrl: any }
          | { id: string; login: string; avatarUrl: any }
          | { id: string; login: string; name: string | null; avatarUrl: any }
          | { id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean }
          | null;
        views: { totalCount: number; nodes: Array<{ id: string; name: string; number: number } | null> | null };
      }
    | Record<PropertyKey, never>
    | null;
};

export type PullRequestFieldsFragment = {
  id: string;
  title: string;
  permalink: any;
  merged: boolean;
  number: number;
  isDraft: boolean;
  closed: boolean;
  updatedAt: any;
  mergeable: Types.MergeableState;
  reviewDecision: Types.PullRequestReviewDecision | null;
  headRefName: string;
  isMergeQueueEnabled: boolean;
  isInMergeQueue: boolean;
  mergeStateStatus: Types.MergeStateStatus;
  milestone: { id: string; title: string } | null;
  repository: {
    id: string;
    nameWithOwner: string;
    name: string;
    url: any;
    mergeCommitAllowed: boolean;
    squashMergeAllowed: boolean;
    rebaseMergeAllowed: boolean;
    autoMergeAllowed: boolean;
    defaultBranchRef: { target: { oid: any } | { oid: any } | { oid: any } | { oid: any } | null } | null;
    owner: { login: string; avatarUrl: any } | { login: string; avatarUrl: any };
  };
  headRef: { name: string } | null;
  author:
    | { id: string; login: string; avatarUrl: any }
    | { id: string; login: string; name: string | null; avatarUrl: any }
    | { id: string; login: string; avatarUrl: any }
    | { id: string; login: string; name: string | null; avatarUrl: any }
    | { id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean }
    | null;
  comments: { totalCount: number };
  reviewThreads: { totalCount: number; nodes: Array<{ comments: { totalCount: number } } | null> | null };
  reviews: { totalCount: number; nodes: Array<{ bodyText: string } | null> | null } | null;
  commits: { nodes: Array<{ commit: { statusCheckRollup: { state: Types.StatusState } | null } } | null> | null };
  assignees: {
    totalCount: number;
    nodes: Array<{ id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean } | null> | null;
  };
  autoMergeRequest: { enabledAt: any; mergeMethod: Types.PullRequestMergeMethod } | null;
};

export type SearchPullRequestsQueryVariables = Exact<{
  query: string;
  numberOfItems: number;
  after?: string | null | undefined;
}>;

export type SearchPullRequestsQuery = {
  search: {
    edges: Array<{
      node:
        | {
            id: string;
            title: string;
            permalink: any;
            merged: boolean;
            number: number;
            isDraft: boolean;
            closed: boolean;
            updatedAt: any;
            mergeable: Types.MergeableState;
            reviewDecision: Types.PullRequestReviewDecision | null;
            headRefName: string;
            isMergeQueueEnabled: boolean;
            isInMergeQueue: boolean;
            mergeStateStatus: Types.MergeStateStatus;
            milestone: { id: string; title: string } | null;
            repository: {
              id: string;
              nameWithOwner: string;
              name: string;
              url: any;
              mergeCommitAllowed: boolean;
              squashMergeAllowed: boolean;
              rebaseMergeAllowed: boolean;
              autoMergeAllowed: boolean;
              defaultBranchRef: { target: { oid: any } | { oid: any } | { oid: any } | { oid: any } | null } | null;
              owner: { login: string; avatarUrl: any } | { login: string; avatarUrl: any };
            };
            headRef: { name: string } | null;
            author:
              | { id: string; login: string; avatarUrl: any }
              | { id: string; login: string; name: string | null; avatarUrl: any }
              | { id: string; login: string; avatarUrl: any }
              | { id: string; login: string; name: string | null; avatarUrl: any }
              | { id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean }
              | null;
            comments: { totalCount: number };
            reviewThreads: { totalCount: number; nodes: Array<{ comments: { totalCount: number } } | null> | null };
            reviews: { totalCount: number; nodes: Array<{ bodyText: string } | null> | null } | null;
            commits: {
              nodes: Array<{ commit: { statusCheckRollup: { state: Types.StatusState } | null } } | null> | null;
            };
            assignees: {
              totalCount: number;
              nodes: Array<{
                id: string;
                avatarUrl: any;
                name: string | null;
                login: string;
                isViewer: boolean;
              } | null> | null;
            };
            autoMergeRequest: { enabledAt: any; mergeMethod: Types.PullRequestMergeMethod } | null;
          }
        | Record<PropertyKey, never>
        | null;
    } | null> | null;
    pageInfo: { endCursor: string | null; hasNextPage: boolean };
  };
};

export type PullRequestDetailsFieldsFragment = {
  id: string;
  title: string;
  body: string;
  permalink: any;
  merged: boolean;
  number: number;
  isDraft: boolean;
  closed: boolean;
  createdAt: any;
  updatedAt: any;
  additions: number;
  deletions: number;
  mergeable: Types.MergeableState;
  isMergeQueueEnabled: boolean;
  isInMergeQueue: boolean;
  mergeStateStatus: Types.MergeStateStatus;
  baseRefName: string;
  headRefName: string;
  autoMergeRequest: { enabledAt: any; mergeMethod: Types.PullRequestMergeMethod } | null;
  milestone: { id: string; title: string } | null;
  repository: {
    id: string;
    nameWithOwner: string;
    name: string;
    url: any;
    mergeCommitAllowed: boolean;
    squashMergeAllowed: boolean;
    rebaseMergeAllowed: boolean;
    autoMergeAllowed: boolean;
    defaultBranchRef: { target: { oid: any } | { oid: any } | { oid: any } | { oid: any } | null } | null;
    owner: { login: string; avatarUrl: any } | { login: string; avatarUrl: any };
  };
  baseRef: { name: string } | null;
  headRef: { name: string } | null;
  labels: { totalCount: number; nodes: Array<{ id: string; name: string; color: string } | null> | null } | null;
  author:
    | { id: string; login: string; avatarUrl: any }
    | { id: string; login: string; name: string | null; avatarUrl: any }
    | { id: string; login: string; avatarUrl: any }
    | { id: string; login: string; name: string | null; avatarUrl: any }
    | { id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean }
    | null;
  comments: { totalCount: number };
  reviewRequests: {
    totalCount: number;
    nodes: Array<{
      requestedReviewer:
        | { id: string; githubUsername: string; userAvatarURL: any }
        | { id: string; teamName: string; teamAvatarURL: any }
        | { id: string; githubUsername: string; userName: string | null; userAvatarURL: any }
        | Record<PropertyKey, never>
        | null;
    } | null> | null;
  } | null;
  reviews: {
    totalCount: number;
    nodes: Array<{
      state: Types.PullRequestReviewState;
      author:
        | { id: string; login: string; avatarUrl: any }
        | { id: string; login: string; name: string | null; avatarUrl: any }
        | { id: string; login: string; avatarUrl: any }
        | { id: string; login: string; name: string | null; avatarUrl: any }
        | { id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean }
        | null;
    } | null> | null;
  } | null;
  commits: { nodes: Array<{ commit: { statusCheckRollup: { state: Types.StatusState } | null } } | null> | null };
  assignees: {
    totalCount: number;
    nodes: Array<{ id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean } | null> | null;
  };
  projectsV2: { totalCount: number; nodes: Array<{ id: string; title: string } | null> | null };
};

export type PullRequestDetailsQueryVariables = Exact<{
  nodeId: string | number;
}>;

export type PullRequestDetailsQuery = {
  node:
    | {
        id: string;
        title: string;
        body: string;
        permalink: any;
        merged: boolean;
        number: number;
        isDraft: boolean;
        closed: boolean;
        createdAt: any;
        updatedAt: any;
        additions: number;
        deletions: number;
        mergeable: Types.MergeableState;
        isMergeQueueEnabled: boolean;
        isInMergeQueue: boolean;
        mergeStateStatus: Types.MergeStateStatus;
        baseRefName: string;
        headRefName: string;
        autoMergeRequest: { enabledAt: any; mergeMethod: Types.PullRequestMergeMethod } | null;
        milestone: { id: string; title: string } | null;
        repository: {
          id: string;
          nameWithOwner: string;
          name: string;
          url: any;
          mergeCommitAllowed: boolean;
          squashMergeAllowed: boolean;
          rebaseMergeAllowed: boolean;
          autoMergeAllowed: boolean;
          defaultBranchRef: { target: { oid: any } | { oid: any } | { oid: any } | { oid: any } | null } | null;
          owner: { login: string; avatarUrl: any } | { login: string; avatarUrl: any };
        };
        baseRef: { name: string } | null;
        headRef: { name: string } | null;
        labels: { totalCount: number; nodes: Array<{ id: string; name: string; color: string } | null> | null } | null;
        author:
          | { id: string; login: string; avatarUrl: any }
          | { id: string; login: string; name: string | null; avatarUrl: any }
          | { id: string; login: string; avatarUrl: any }
          | { id: string; login: string; name: string | null; avatarUrl: any }
          | { id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean }
          | null;
        comments: { totalCount: number };
        reviewRequests: {
          totalCount: number;
          nodes: Array<{
            requestedReviewer:
              | { id: string; githubUsername: string; userAvatarURL: any }
              | { id: string; teamName: string; teamAvatarURL: any }
              | { id: string; githubUsername: string; userName: string | null; userAvatarURL: any }
              | Record<PropertyKey, never>
              | null;
          } | null> | null;
        } | null;
        reviews: {
          totalCount: number;
          nodes: Array<{
            state: Types.PullRequestReviewState;
            author:
              | { id: string; login: string; avatarUrl: any }
              | { id: string; login: string; name: string | null; avatarUrl: any }
              | { id: string; login: string; avatarUrl: any }
              | { id: string; login: string; name: string | null; avatarUrl: any }
              | { id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean }
              | null;
          } | null> | null;
        } | null;
        commits: { nodes: Array<{ commit: { statusCheckRollup: { state: Types.StatusState } | null } } | null> | null };
        assignees: {
          totalCount: number;
          nodes: Array<{
            id: string;
            avatarUrl: any;
            name: string | null;
            login: string;
            isViewer: boolean;
          } | null> | null;
        };
        projectsV2: { totalCount: number; nodes: Array<{ id: string; title: string } | null> | null };
      }
    | Record<PropertyKey, never>
    | null;
};

export type RepositoryCollaboratorsForPullRequestsQueryVariables = Exact<{
  owner: string;
  name: string;
  pullRequestNumber: number;
  searchQuery?: string | null | undefined;
}>;

export type RepositoryCollaboratorsForPullRequestsQuery = {
  repository: {
    collaborators: {
      totalCount: number;
      nodes: Array<{ id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean } | null> | null;
    } | null;
    pullRequest: { assignees: { totalCount: number; nodes: Array<{ id: string } | null> | null } } | null;
  } | null;
};

export type RepositoryProjectsForPullRequestsQueryVariables = Exact<{
  owner: string;
  name: string;
  pullRequestNumber: number;
}>;

export type RepositoryProjectsForPullRequestsQuery = {
  repository: {
    projectsV2: { totalCount: number; nodes: Array<{ id: string; title: string; number: number } | null> | null };
    pullRequest: { projectsV2: { totalCount: number; nodes: Array<{ id: string } | null> | null } } | null;
  } | null;
};

export type PullRequestCommitFieldsFragment = {
  commits: {
    totalCount: number;
    nodes: Array<{
      commit: {
        id: string;
        authoredDate: any;
        message: string;
        oid: any;
        abbreviatedOid: string;
        url: any;
        treeUrl: any;
        author: { avatarUrl: any; name: string | null } | null;
        statusCheckRollup: { state: Types.StatusState } | null;
      };
    } | null> | null;
  };
};

export type PullRequestCommitsQueryVariables = Exact<{
  nodeId: string | number;
}>;

export type PullRequestCommitsQuery = {
  node:
    | {
        commits: {
          totalCount: number;
          nodes: Array<{
            commit: {
              id: string;
              authoredDate: any;
              message: string;
              oid: any;
              abbreviatedOid: string;
              url: any;
              treeUrl: any;
              author: { avatarUrl: any; name: string | null } | null;
              statusCheckRollup: { state: Types.StatusState } | null;
            };
          } | null> | null;
        };
      }
    | Record<PropertyKey, never>
    | null;
};

export type CommitFieldsFragment = { authoredDate: any; oid: any; message: string };

export type ClosePullRequestMutationVariables = Exact<{
  nodeId: string | number;
}>;

export type ClosePullRequestMutation = { closePullRequest: { pullRequest: { id: string } | null } | null };

export type ReopenPullRequestMutationVariables = Exact<{
  nodeId: string | number;
}>;

export type ReopenPullRequestMutation = { reopenPullRequest: { pullRequest: { id: string } | null } | null };

export type MarkPullRequestReadyForReviewMutationVariables = Exact<{
  nodeId: string | number;
}>;

export type MarkPullRequestReadyForReviewMutation = {
  markPullRequestReadyForReview: { pullRequest: { id: string } | null } | null;
};

export type AddPullRequestReviewMutationVariables = Exact<{
  nodeId: string | number;
  event?: Types.PullRequestReviewEvent | null | undefined;
  body?: string | null | undefined;
}>;

export type AddPullRequestReviewMutation = {
  addPullRequestReview: { pullRequestReview: { id: string } | null } | null;
};

export type ChangePullRequestAssigneesMutationVariables = Exact<{
  pullRequestId: string | number;
  assigneeIds?: Array<string | number> | string | number | null | undefined;
}>;

export type ChangePullRequestAssigneesMutation = { updatePullRequest: { clientMutationId: string | null } | null };

export type ChangePullRequestMilestoneMutationVariables = Exact<{
  pullRequestId: string | number;
  milestoneId?: string | number | null | undefined;
}>;

export type ChangePullRequestMilestoneMutation = { updatePullRequest: { clientMutationId: string | null } | null };

export type AddPullRequestToProjectMutationVariables = Exact<{
  pullRequestId: string | number;
  projectId: string | number;
}>;

export type AddPullRequestToProjectMutation = { addProjectV2ItemById: { clientMutationId: string | null } | null };

export type RequestReviewMutationVariables = Exact<{
  pullRequestId: string | number;
  collaboratorId: string | number;
}>;

export type RequestReviewMutation = { requestReviews: { clientMutationId: string | null } | null };

export type MergePullRequestMutationVariables = Exact<{
  nodeId: string | number;
  method: Types.PullRequestMergeMethod;
}>;

export type MergePullRequestMutation = { mergePullRequest: { pullRequest: { nodeId: string } | null } | null };

export type AddPullRequestToMergeQueueMutationVariables = Exact<{
  nodeId: string | number;
}>;

export type AddPullRequestToMergeQueueMutation = {
  enqueuePullRequest: { __typename: "EnqueuePullRequestPayload" } | null;
};

export type RemovePullRequestFromMergeQueueMutationVariables = Exact<{
  nodeId: string | number;
}>;

export type RemovePullRequestFromMergeQueueMutation = {
  dequeuePullRequest: { __typename: "DequeuePullRequestPayload" } | null;
};

export type EnablePullRequestAutoMergeMutationVariables = Exact<{
  nodeId: string | number;
  mergeMethod?: Types.PullRequestMergeMethod | null | undefined;
}>;

export type EnablePullRequestAutoMergeMutation = {
  enablePullRequestAutoMerge: { pullRequest: { id: string } | null } | null;
};

export type DisablePullRequestAutoMergeMutationVariables = Exact<{
  nodeId: string | number;
}>;

export type DisablePullRequestAutoMergeMutation = {
  disablePullRequestAutoMerge: { pullRequest: { id: string } | null } | null;
};

export type CreatePullRequestMutationVariables = Exact<{
  repositoryId: string | number;
  into: string;
  from: string;
  title: string;
  body: string;
  isDraft: boolean;
}>;

export type CreatePullRequestMutation = { createPullRequest: { pullRequest: { id: string } | null } | null };

export type InitPullRequestMutationVariables = Exact<{
  pullRequestId: string | number;
  reviewersIds: Array<string | number> | string | number;
  assigneeIds: Array<string | number> | string | number;
  labelsIds: Array<string | number> | string | number;
  milestoneId?: string | number | null | undefined;
}>;

export type InitPullRequestMutation = {
  requestReviews: { pullRequest: { id: string; reviewRequests: { totalCount: number } | null } | null } | null;
  updatePullRequest: {
    pullRequest: {
      id: string;
      title: string;
      permalink: any;
      merged: boolean;
      number: number;
      isDraft: boolean;
      closed: boolean;
      updatedAt: any;
      mergeable: Types.MergeableState;
      reviewDecision: Types.PullRequestReviewDecision | null;
      headRefName: string;
      isMergeQueueEnabled: boolean;
      isInMergeQueue: boolean;
      mergeStateStatus: Types.MergeStateStatus;
      milestone: { id: string; title: string } | null;
      repository: {
        id: string;
        nameWithOwner: string;
        name: string;
        url: any;
        mergeCommitAllowed: boolean;
        squashMergeAllowed: boolean;
        rebaseMergeAllowed: boolean;
        autoMergeAllowed: boolean;
        defaultBranchRef: { target: { oid: any } | { oid: any } | { oid: any } | { oid: any } | null } | null;
        owner: { login: string; avatarUrl: any } | { login: string; avatarUrl: any };
      };
      headRef: { name: string } | null;
      author:
        | { id: string; login: string; avatarUrl: any }
        | { id: string; login: string; name: string | null; avatarUrl: any }
        | { id: string; login: string; avatarUrl: any }
        | { id: string; login: string; name: string | null; avatarUrl: any }
        | { id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean }
        | null;
      comments: { totalCount: number };
      reviewThreads: { totalCount: number; nodes: Array<{ comments: { totalCount: number } } | null> | null };
      reviews: { totalCount: number; nodes: Array<{ bodyText: string } | null> | null } | null;
      commits: { nodes: Array<{ commit: { statusCheckRollup: { state: Types.StatusState } | null } } | null> | null };
      assignees: {
        totalCount: number;
        nodes: Array<{
          id: string;
          avatarUrl: any;
          name: string | null;
          login: string;
          isViewer: boolean;
        } | null> | null;
      };
      autoMergeRequest: { enabledAt: any; mergeMethod: Types.PullRequestMergeMethod } | null;
    } | null;
  } | null;
};

export type ShortRepositoryFieldsFragment = {
  id: string;
  nameWithOwner: string;
  name: string;
  url: any;
  mergeCommitAllowed: boolean;
  squashMergeAllowed: boolean;
  rebaseMergeAllowed: boolean;
  autoMergeAllowed: boolean;
  defaultBranchRef: { target: { oid: any } | { oid: any } | { oid: any } | { oid: any } | null } | null;
  owner: { login: string; avatarUrl: any } | { login: string; avatarUrl: any };
};

export type ExtendedRepositoryFieldsFragment = {
  id: string;
  nameWithOwner: string;
  name: string;
  url: any;
  mergeCommitAllowed: boolean;
  squashMergeAllowed: boolean;
  rebaseMergeAllowed: boolean;
  autoMergeAllowed: boolean;
  updatedAt: any;
  pushedAt: any;
  stargazerCount: number;
  isArchived: boolean;
  isFork: boolean;
  isPrivate: boolean;
  viewerHasStarred: boolean;
  hasIssuesEnabled: boolean;
  hasWikiEnabled: boolean;
  hasProjectsEnabled: boolean;
  hasDiscussionsEnabled: boolean;
  owner: { login: string; avatarUrl: any } | { login: string; avatarUrl: any };
  primaryLanguage: { id: string; name: string; color: string | null } | null;
  releases: { totalCount: number };
};

export type SearchRepositoriesQueryVariables = Exact<{
  query: string;
  numberOfItems: number;
  after?: string | null | undefined;
}>;

export type SearchRepositoriesQuery = {
  search: {
    nodes: Array<
      | {
          id: string;
          nameWithOwner: string;
          name: string;
          url: any;
          mergeCommitAllowed: boolean;
          squashMergeAllowed: boolean;
          rebaseMergeAllowed: boolean;
          autoMergeAllowed: boolean;
          updatedAt: any;
          pushedAt: any;
          stargazerCount: number;
          isArchived: boolean;
          isFork: boolean;
          isPrivate: boolean;
          viewerHasStarred: boolean;
          hasIssuesEnabled: boolean;
          hasWikiEnabled: boolean;
          hasProjectsEnabled: boolean;
          hasDiscussionsEnabled: boolean;
          owner: { login: string; avatarUrl: any } | { login: string; avatarUrl: any };
          primaryLanguage: { id: string; name: string; color: string | null } | null;
          releases: { totalCount: number };
        }
      | Record<PropertyKey, never>
      | null
    > | null;
    pageInfo: { endCursor: string | null; hasNextPage: boolean };
  };
};

export type MyLatestRepositoriesQueryVariables = Exact<{
  numberOfItems: number;
  orderByField: Types.RepositoryOrderField;
  orderByDirection: Types.OrderDirection;
}>;

export type MyLatestRepositoriesQuery = {
  viewer: {
    repositories: {
      nodes: Array<{
        id: string;
        nameWithOwner: string;
        name: string;
        url: any;
        mergeCommitAllowed: boolean;
        squashMergeAllowed: boolean;
        rebaseMergeAllowed: boolean;
        autoMergeAllowed: boolean;
        updatedAt: any;
        pushedAt: any;
        stargazerCount: number;
        isArchived: boolean;
        isFork: boolean;
        isPrivate: boolean;
        viewerHasStarred: boolean;
        hasIssuesEnabled: boolean;
        hasWikiEnabled: boolean;
        hasProjectsEnabled: boolean;
        hasDiscussionsEnabled: boolean;
        owner: { login: string; avatarUrl: any } | { login: string; avatarUrl: any };
        primaryLanguage: { id: string; name: string; color: string | null } | null;
        releases: { totalCount: number };
      } | null> | null;
    };
  };
};

export type MilestonesForRepositoryQueryVariables = Exact<{
  owner: string;
  name: string;
}>;

export type MilestonesForRepositoryQuery = {
  repository: {
    milestones: {
      totalCount: number;
      nodes: Array<{ id: string; title: string; number: number } | null> | null;
    } | null;
  } | null;
};

export type CommentsForPullRequestQueryVariables = Exact<{
  owner: string;
  name: string;
  number: number;
}>;

export type CommentsForPullRequestQuery = {
  repository: {
    pullRequest: {
      comments: {
        nodes: Array<{
          body: string;
          author:
            | { login: string }
            | { login: string }
            | { login: string }
            | { login: string }
            | { login: string }
            | null;
        } | null> | null;
      };
    } | null;
  } | null;
};

export type DataForRepositoryQueryVariables = Exact<{
  owner: string;
  name: string;
}>;

export type DataForRepositoryQuery = {
  repository: {
    defaultBranchRef: {
      id: string;
      name: string;
      target: { authoredDate: any; oid: any; message: string } | Record<PropertyKey, never> | null;
    } | null;
    issueTypes: {
      totalCount: number;
      nodes: Array<{ id: string; name: string; color: Types.IssueTypeColor; isEnabled: boolean } | null> | null;
    } | null;
    refs: {
      totalCount: number;
      nodes: Array<{
        id: string;
        name: string;
        target: { authoredDate: any; oid: any; message: string } | Record<PropertyKey, never> | null;
      } | null> | null;
    } | null;
    collaborators: {
      totalCount: number;
      nodes: Array<{ id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean } | null> | null;
    } | null;
    labels: {
      totalCount: number;
      nodes: Array<{ id: string; name: string; color: string; isDefault: boolean } | null> | null;
    } | null;
    projectsV2: { totalCount: number; nodes: Array<{ id: string; title: string } | null> | null };
    milestones: { totalCount: number; nodes: Array<{ id: string; title: string } | null> | null } | null;
    owner:
      | {
          __typename: "Organization";
          projectsV2: { totalCount: number; nodes: Array<{ id: string; title: string } | null> | null };
        }
      | { __typename: "User" };
    pullRequestTemplates: Array<{ body: string | null }> | null;
    issueTemplates: Array<{ name: string; about: string | null; title: string | null; body: string | null }> | null;
  } | null;
};

export type SearchRepositoryBranchesQueryVariables = Exact<{
  owner: string;
  name: string;
  query: string;
}>;

export type SearchRepositoryBranchesQuery = {
  repository: {
    refs: {
      nodes: Array<{
        id: string;
        name: string;
        target: { authoredDate: any; oid: any; message: string } | Record<PropertyKey, never> | null;
      } | null> | null;
    } | null;
  } | null;
};

export type RepositoryIssuesQueryVariables = Exact<{
  owner: string;
  name: string;
}>;

export type RepositoryIssuesQuery = {
  repository: {
    url: any;
    defaultBranchRef: {
      id: string;
      name: string;
      target: { oid: any } | { oid: any } | { oid: any } | { oid: any } | null;
    } | null;
    issues: {
      nodes: Array<{
        id: string;
        url: any;
        title: string;
        number: number;
        closed: boolean;
        state: Types.IssueState;
        stateReason: Types.IssueStateReason | null;
        updatedAt: any;
        author:
          | { id: string; login: string; avatarUrl: any }
          | { id: string; login: string; name: string | null; avatarUrl: any }
          | { id: string; login: string; avatarUrl: any }
          | { id: string; login: string; name: string | null; avatarUrl: any }
          | { id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean }
          | null;
        linkedBranches: {
          totalCount: number;
          nodes: Array<{ id: string; ref: { id: string; name: string } | null } | null> | null;
        };
        milestone: { id: string; title: string } | null;
        repository: {
          id: string;
          nameWithOwner: string;
          name: string;
          url: any;
          mergeCommitAllowed: boolean;
          squashMergeAllowed: boolean;
          rebaseMergeAllowed: boolean;
          autoMergeAllowed: boolean;
          defaultBranchRef: { target: { oid: any } | { oid: any } | { oid: any } | { oid: any } | null } | null;
          owner: { login: string; avatarUrl: any } | { login: string; avatarUrl: any };
        };
        comments: { totalCount: number };
        assignees: {
          totalCount: number;
          nodes: Array<{
            id: string;
            avatarUrl: any;
            name: string | null;
            login: string;
            isViewer: boolean;
          } | null> | null;
        };
      } | null> | null;
    };
  } | null;
};

export type ReleaseFieldsFragment = {
  id: string;
  description: string | null;
  name: string | null;
  publishedAt: any;
  createdAt: any;
  tagName: string;
  url: any;
};

export type RepositoryReleasesQueryVariables = Exact<{
  name: string;
  owner: string;
}>;

export type RepositoryReleasesQuery = {
  repository: {
    releases: {
      nodes: Array<{
        id: string;
        description: string | null;
        name: string | null;
        publishedAt: any;
        createdAt: any;
        tagName: string;
        url: any;
      } | null> | null;
    };
  } | null;
};

export type AddStarMutationVariables = Exact<{
  repositoryId: string | number;
}>;

export type AddStarMutation = { addStar: { clientMutationId: string | null } | null };

export type RemoveStarMutationVariables = Exact<{
  repositoryId: string | number;
}>;

export type RemoveStarMutation = { removeStar: { clientMutationId: string | null } | null };

export type MyStarredRepositoriesQueryVariables = Exact<{
  numberOfItems: number;
  after?: string | null | undefined;
  orderByField: Types.StarOrderField;
  orderByDirection: Types.OrderDirection;
}>;

export type MyStarredRepositoriesQuery = {
  viewer: {
    starredRepositories: {
      nodes: Array<{
        id: string;
        nameWithOwner: string;
        name: string;
        url: any;
        mergeCommitAllowed: boolean;
        squashMergeAllowed: boolean;
        rebaseMergeAllowed: boolean;
        autoMergeAllowed: boolean;
        updatedAt: any;
        pushedAt: any;
        stargazerCount: number;
        isArchived: boolean;
        isFork: boolean;
        isPrivate: boolean;
        viewerHasStarred: boolean;
        hasIssuesEnabled: boolean;
        hasWikiEnabled: boolean;
        hasProjectsEnabled: boolean;
        hasDiscussionsEnabled: boolean;
        owner: { login: string; avatarUrl: any } | { login: string; avatarUrl: any };
        primaryLanguage: { id: string; name: string; color: string | null } | null;
        releases: { totalCount: number };
      } | null> | null;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  };
};

export type UserFieldsFragment = { id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean };

type AuthorFields_Bot_Fragment = { id: string; login: string; avatarUrl: any };

type AuthorFields_EnterpriseUserAccount_Fragment = { id: string; login: string; name: string | null; avatarUrl: any };

type AuthorFields_Mannequin_Fragment = { id: string; login: string; avatarUrl: any };

type AuthorFields_Organization_Fragment = { id: string; login: string; name: string | null; avatarUrl: any };

type AuthorFields_User_Fragment = { id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean };

export type AuthorFieldsFragment =
  | AuthorFields_Bot_Fragment
  | AuthorFields_EnterpriseUserAccount_Fragment
  | AuthorFields_Mannequin_Fragment
  | AuthorFields_Organization_Fragment
  | AuthorFields_User_Fragment;

export type ProjectViewerFieldsFragment = { id: string; name: string; number: number };

export type GetViewerQueryVariables = Exact<{ [key: string]: never }>;

export type GetViewerQuery = {
  viewer: {
    id: string;
    avatarUrl: any;
    name: string | null;
    login: string;
    isViewer: boolean;
    organizations: { totalCount: number; nodes: Array<{ avatarUrl: any; login: string } | null> | null };
    projectsV2: {
      totalCount: number;
      nodes: Array<{
        id: string;
        title: string;
        public: boolean;
        number: number;
        readme: string | null;
        closed: boolean;
        shortDescription: string | null;
        url: any;
        createdAt: any;
        updatedAt: any;
        viewerCanClose: boolean;
        viewerCanUpdate: boolean;
        viewerCanReopen: boolean;
        creator:
          | { id: string; login: string; avatarUrl: any }
          | { id: string; login: string; name: string | null; avatarUrl: any }
          | { id: string; login: string; avatarUrl: any }
          | { id: string; login: string; name: string | null; avatarUrl: any }
          | { id: string; avatarUrl: any; name: string | null; login: string; isViewer: boolean }
          | null;
        views: { totalCount: number; nodes: Array<{ id: string; name: string; number: number } | null> | null };
      } | null> | null;
    };
  };
};

export type GetViewerStatsQueryVariables = Exact<{
  repositoriesCount?: number | null | undefined;
}>;

export type GetViewerStatsQuery = {
  viewer: {
    bio: string | null;
    company: string | null;
    location: string | null;
    url: any;
    websiteUrl: any;
    createdAt: any;
    id: string;
    avatarUrl: any;
    name: string | null;
    login: string;
    isViewer: boolean;
    followers: { totalCount: number };
    following: { totalCount: number };
    starredRepositories: { totalCount: number };
    pullRequestsAuthored: { totalCount: number };
    pullRequestsMerged: { totalCount: number };
    pullRequestsOpen: { totalCount: number };
    issuesAuthored: { totalCount: number };
    issuesOpen: { totalCount: number };
    recentPullRequests: {
      nodes: Array<{
        id: string;
        number: number;
        title: string;
        url: any;
        state: Types.PullRequestState;
        repository: { nameWithOwner: string };
      } | null> | null;
    };
    recentOpenPullRequests: {
      nodes: Array<{
        id: string;
        number: number;
        title: string;
        url: any;
        repository: { nameWithOwner: string };
      } | null> | null;
    };
    recentIssues: {
      nodes: Array<{
        id: string;
        number: number;
        title: string;
        url: any;
        state: Types.IssueState;
        repository: { nameWithOwner: string };
      } | null> | null;
    };
    recentOpenIssues: {
      nodes: Array<{
        id: string;
        number: number;
        title: string;
        url: any;
        repository: { nameWithOwner: string };
      } | null> | null;
    };
    contributionsCollection: { totalCommitContributions: number };
    publicRepos: { totalCount: number };
    ownedRepositories: {
      totalCount: number;
      nodes: Array<{
        id: string;
        nameWithOwner: string;
        url: any;
        stargazerCount: number;
        forkCount: number;
      } | null> | null;
    };
    organizations: {
      totalCount: number;
      nodes: Array<{ id: string; login: string; name: string | null; avatarUrl: any; url: any } | null> | null;
    };
  };
  rateLimit: { remaining: number; limit: number; used: number; resetAt: any } | null;
};

export const ShortRepositoryFieldsFragmentDoc = gql`
  fragment ShortRepositoryFields on Repository {
    id
    defaultBranchRef {
      target {
        oid
      }
    }
    nameWithOwner
    name
    owner {
      login
      avatarUrl(size: 64)
    }
    url
    mergeCommitAllowed
    squashMergeAllowed
    rebaseMergeAllowed
    autoMergeAllowed
  }
`;
export const DiscussionFieldsFragmentDoc = gql`
  fragment DiscussionFields on Discussion {
    id
    title
    bodyText
    publishedAt
    repository {
      ...ShortRepositoryFields
    }
    url
    upvoteCount
    category {
      name
      emoji
      emojiHTML
    }
    comments {
      totalCount
    }
    answer {
      bodyText
    }
    author {
      login
      avatarUrl
    }
  }
  ${ShortRepositoryFieldsFragmentDoc}
`;
export const UserFieldsFragmentDoc = gql`
  fragment UserFields on User {
    id
    avatarUrl
    name
    login
    isViewer
  }
`;
export const AuthorFieldsFragmentDoc = gql`
  fragment AuthorFields on Actor {
    ... on Bot {
      id
      login
      avatarUrl(size: 64)
    }
    ... on User {
      ...UserFields
    }
    ... on Mannequin {
      id
      login
      avatarUrl(size: 64)
    }
    ... on Organization {
      id
      login
      name
      avatarUrl(size: 64)
    }
    ... on EnterpriseUserAccount {
      id
      login
      name
      avatarUrl(size: 64)
    }
  }
  ${UserFieldsFragmentDoc}
`;
export const IssueFieldsFragmentDoc = gql`
  fragment IssueFields on Issue {
    id
    url
    title
    number
    closed
    state
    stateReason
    updatedAt
    author {
      ...AuthorFields
    }
    linkedBranches(first: 50) {
      totalCount
      nodes {
        ... on LinkedBranch {
          id
          ref {
            id
            name
          }
        }
      }
    }
    milestone {
      id
      title
    }
    repository {
      ...ShortRepositoryFields
    }
    comments(first: 0) {
      totalCount
    }
    assignees(first: 50) {
      totalCount
      nodes {
        ... on User {
          ...UserFields
        }
      }
    }
  }
  ${AuthorFieldsFragmentDoc}
  ${ShortRepositoryFieldsFragmentDoc}
  ${UserFieldsFragmentDoc}
`;
export const IssueDetailFieldsFragmentDoc = gql`
  fragment IssueDetailFields on Issue {
    id
    url
    title
    body
    number
    closed
    state
    stateReason
    updatedAt
    author {
      ...AuthorFields
    }
    labels(first: 50, orderBy: { field: NAME, direction: ASC }) {
      totalCount
      nodes {
        id
        name
        color
        isDefault
      }
    }
    linkedBranches(first: 50) {
      totalCount
      nodes {
        ... on LinkedBranch {
          id
          ref {
            name
          }
        }
      }
    }
    milestone {
      id
      title
    }
    repository {
      ...ShortRepositoryFields
    }
    assignees(first: 50) {
      totalCount
      nodes {
        ... on User {
          ...UserFields
        }
      }
    }
    projectsV2(first: 25) {
      totalCount
      nodes {
        id
        title
      }
    }
  }
  ${AuthorFieldsFragmentDoc}
  ${ShortRepositoryFieldsFragmentDoc}
  ${UserFieldsFragmentDoc}
`;
export const ProjectViewerFieldsFragmentDoc = gql`
  fragment ProjectViewerFields on ProjectV2View {
    id
    name
    number
  }
`;
export const ProjectFieldsFragmentDoc = gql`
  fragment ProjectFields on ProjectV2 {
    id
    title
    public
    number
    readme
    closed
    shortDescription
    url
    createdAt
    creator {
      ...AuthorFields
    }
    updatedAt
    views(first: 50) {
      totalCount
      nodes {
        ...ProjectViewerFields
      }
    }
    viewerCanClose
    viewerCanUpdate
    viewerCanReopen
  }
  ${AuthorFieldsFragmentDoc}
  ${ProjectViewerFieldsFragmentDoc}
`;
export const PullRequestFieldsFragmentDoc = gql`
  fragment PullRequestFields on PullRequest {
    id
    title
    permalink
    merged
    number
    isDraft
    closed
    updatedAt
    mergeable
    milestone {
      id
      title
    }
    reviewDecision
    repository {
      ...ShortRepositoryFields
    }
    headRefName
    headRef {
      name
    }
    author {
      ...AuthorFields
    }
    comments(first: 0) {
      totalCount
    }
    reviewThreads(first: 100) {
      totalCount
      nodes {
        comments(first: 0) {
          totalCount
        }
      }
    }
    reviews(first: 100) {
      totalCount
      nodes {
        bodyText
      }
    }
    commits(last: 1) {
      nodes {
        commit {
          statusCheckRollup {
            state
          }
        }
      }
    }
    assignees(first: 50) {
      totalCount
      nodes {
        ... on User {
          ...UserFields
        }
      }
    }
    isMergeQueueEnabled
    isInMergeQueue
    mergeStateStatus
    autoMergeRequest {
      enabledAt
      mergeMethod
    }
  }
  ${ShortRepositoryFieldsFragmentDoc}
  ${AuthorFieldsFragmentDoc}
  ${UserFieldsFragmentDoc}
`;
export const PullRequestDetailsFieldsFragmentDoc = gql`
  fragment PullRequestDetailsFields on PullRequest {
    id
    title
    body
    permalink
    merged
    number
    isDraft
    closed
    createdAt
    updatedAt
    additions
    deletions
    mergeable
    isMergeQueueEnabled
    isInMergeQueue
    mergeStateStatus
    autoMergeRequest {
      enabledAt
      mergeMethod
    }
    milestone {
      id
      title
    }
    repository {
      ...ShortRepositoryFields
    }
    baseRefName
    baseRef {
      name
    }
    headRefName
    headRef {
      name
    }
    labels(first: 50, orderBy: { field: NAME, direction: ASC }) {
      totalCount
      nodes {
        id
        name
        color
      }
    }
    author {
      ...AuthorFields
    }
    comments(first: 0) {
      totalCount
    }
    reviewRequests(first: 50) {
      totalCount
      nodes {
        requestedReviewer {
          ... on Team {
            id
            teamName: name
            teamAvatarURL: avatarUrl(size: 64)
          }
          ... on User {
            id
            githubUsername: login
            userName: name
            userAvatarURL: avatarUrl(size: 64)
          }
          ... on Mannequin {
            id
            githubUsername: login
            userAvatarURL: avatarUrl(size: 64)
          }
        }
      }
    }
    reviews(first: 10, states: [PENDING, APPROVED, CHANGES_REQUESTED]) {
      totalCount
      nodes {
        state
        author {
          ...AuthorFields
        }
      }
    }
    commits(last: 1) {
      nodes {
        commit {
          statusCheckRollup {
            state
          }
        }
      }
    }
    assignees(first: 50) {
      totalCount
      nodes {
        ... on User {
          ...UserFields
        }
      }
    }
    projectsV2(first: 20) {
      totalCount
      nodes {
        id
        title
      }
    }
  }
  ${ShortRepositoryFieldsFragmentDoc}
  ${AuthorFieldsFragmentDoc}
  ${UserFieldsFragmentDoc}
`;
export const PullRequestCommitFieldsFragmentDoc = gql`
  fragment PullRequestCommitFields on PullRequest {
    commits(last: 100) {
      totalCount
      nodes {
        commit {
          id
          authoredDate
          message
          oid
          abbreviatedOid
          author {
            avatarUrl(size: 64)
            name
          }
          statusCheckRollup {
            state
          }
          url
          treeUrl
        }
      }
    }
  }
`;
export const CommitFieldsFragmentDoc = gql`
  fragment CommitFields on Commit {
    authoredDate
    oid
    message
  }
`;
export const ExtendedRepositoryFieldsFragmentDoc = gql`
  fragment ExtendedRepositoryFields on Repository {
    id
    nameWithOwner
    name
    owner {
      login
      avatarUrl(size: 64)
    }
    url
    mergeCommitAllowed
    squashMergeAllowed
    rebaseMergeAllowed
    autoMergeAllowed
    updatedAt
    pushedAt
    stargazerCount
    isArchived
    isFork
    isPrivate
    viewerHasStarred
    primaryLanguage {
      id
      name
      color
    }
    hasIssuesEnabled
    hasWikiEnabled
    hasProjectsEnabled
    hasDiscussionsEnabled
    releases {
      totalCount
    }
  }
`;
export const ReleaseFieldsFragmentDoc = gql`
  fragment ReleaseFields on Release {
    id
    description
    name
    publishedAt
    createdAt
    tagName
    url
  }
`;
export const CreateLinkedBranchDocument = gql`
  mutation createLinkedBranch($input: CreateLinkedBranchInput!) {
    createLinkedBranch(input: $input) {
      clientMutationId
      linkedBranch {
        ref {
          id
          name
        }
      }
    }
  }
`;
export const CreateRefDocument = gql`
  mutation createRef($input: CreateRefInput!) {
    createRef(input: $input) {
      clientMutationId
      ref {
        id
        name
      }
    }
  }
`;
export const DeleteLinkedBranchDocument = gql`
  mutation deleteLinkedBranch($input: DeleteLinkedBranchInput!) {
    deleteLinkedBranch(input: $input) {
      clientMutationId
    }
  }
`;
export const SearchDiscussionsDocument = gql`
  query searchDiscussions($query: String!, $numberOfOpenItems: Int!) {
    openDiscussions: search(query: $query, type: DISCUSSION, first: $numberOfOpenItems) {
      nodes {
        ...DiscussionFields
      }
    }
    searchDiscussions: search(query: $query, type: DISCUSSION, first: $numberOfOpenItems) {
      nodes {
        ...DiscussionFields
      }
    }
  }
  ${DiscussionFieldsFragmentDoc}
`;
export const GetGitHubDiscussionNumberDocument = gql`
  query getGitHubDiscussionNumber($filter: String!) {
    search(query: $filter, type: DISCUSSION, first: 1) {
      nodes {
        ... on Discussion {
          number
          url
        }
      }
    }
  }
`;
export const RepositoryCollaboratorsForIssuesDocument = gql`
  query repositoryCollaboratorsForIssues($owner: String!, $name: String!, $issueNumber: Int!) {
    repository(owner: $owner, name: $name) {
      collaborators(first: 25) {
        totalCount
        nodes {
          ... on User {
            ...UserFields
          }
        }
      }
      issue(number: $issueNumber) {
        assignees(first: 25) {
          totalCount
          nodes {
            id
          }
        }
      }
    }
  }
  ${UserFieldsFragmentDoc}
`;
export const RepositoryProjectsForIssuesDocument = gql`
  query repositoryProjectsForIssues($owner: String!, $name: String!, $issueNumber: Int!) {
    repository(owner: $owner, name: $name) {
      projectsV2(first: 50, orderBy: { field: TITLE, direction: ASC }) {
        totalCount
        nodes {
          id
          title
          number
        }
      }
      issue(number: $issueNumber) {
        projectsV2(first: 50) {
          totalCount
          nodes {
            id
          }
        }
      }
    }
  }
`;
export const IssueDetailsDocument = gql`
  query issueDetails($nodeId: ID!) {
    node(id: $nodeId) {
      ...IssueDetailFields
    }
  }
  ${IssueDetailFieldsFragmentDoc}
`;
export const SearchIssuesDocument = gql`
  query searchIssues($query: String!, $numberOfItems: Int!) {
    search(query: $query, type: ISSUE, first: $numberOfItems) {
      nodes {
        ...IssueFields
      }
    }
  }
  ${IssueFieldsFragmentDoc}
`;
export const IssueByNumberDocument = gql`
  query issueByNumber($owner: String!, $name: String!, $issueNumber: Int!) {
    repository(owner: $owner, name: $name) {
      issue(number: $issueNumber) {
        ...IssueFields
      }
    }
  }
  ${IssueFieldsFragmentDoc}
`;
export const CloseIssueDocument = gql`
  mutation closeIssue($nodeId: ID!, $stateReason: IssueClosedStateReason!) {
    closeIssue(input: { issueId: $nodeId, stateReason: $stateReason }) {
      issue {
        id
      }
    }
  }
`;
export const ReopenIssueDocument = gql`
  mutation reopenIssue($nodeId: ID!) {
    reopenIssue(input: { issueId: $nodeId }) {
      issue {
        id
      }
    }
  }
`;
export const ChangeIssueAssigneesDocument = gql`
  mutation changeIssueAssignees($issueId: ID!, $assigneeIds: [ID!]) {
    updateIssue(input: { id: $issueId, assigneeIds: $assigneeIds }) {
      clientMutationId
    }
  }
`;
export const ChangeIssueMilestoneDocument = gql`
  mutation changeIssueMilestone($issueId: ID!, $milestoneId: ID) {
    updateIssue(input: { id: $issueId, milestoneId: $milestoneId }) {
      clientMutationId
    }
  }
`;
export const AddIssueToProjectDocument = gql`
  mutation addIssueToProject($issueId: ID!, $projectId: ID!) {
    addProjectV2ItemById(input: { projectId: $projectId, contentId: $issueId }) {
      clientMutationId
    }
  }
`;
export const CreateIssueDocument = gql`
  mutation createIssue(
    $repositoryId: ID!
    $title: String!
    $body: String!
    $assigneeIds: [ID!]!
    $labelIds: [ID!]!
    $milestoneId: ID
    $issueTypeId: ID
  ) {
    createIssue(
      input: {
        repositoryId: $repositoryId
        title: $title
        body: $body
        assigneeIds: $assigneeIds
        labelIds: $labelIds
        milestoneId: $milestoneId
        issueTypeId: $issueTypeId
      }
    ) {
      issue {
        ...IssueFields
      }
    }
  }
  ${IssueFieldsFragmentDoc}
`;
export const ChangeProjectStatusDocument = gql`
  mutation changeProjectStatus($projectId: ID!, $closed: Boolean!) {
    updateProjectV2(input: { projectId: $projectId, closed: $closed }) {
      clientMutationId
    }
  }
`;
export const ProjectDetailsDocument = gql`
  query projectDetails($nodeId: ID!) {
    node(id: $nodeId) {
      ...ProjectFields
    }
  }
  ${ProjectFieldsFragmentDoc}
`;
export const SearchPullRequestsDocument = gql`
  query searchPullRequests($query: String!, $numberOfItems: Int!, $after: String) {
    search(query: $query, type: ISSUE, first: $numberOfItems, after: $after) {
      edges {
        node {
          ...PullRequestFields
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
  ${PullRequestFieldsFragmentDoc}
`;
export const PullRequestDetailsDocument = gql`
  query pullRequestDetails($nodeId: ID!) {
    node(id: $nodeId) {
      ...PullRequestDetailsFields
    }
  }
  ${PullRequestDetailsFieldsFragmentDoc}
`;
export const RepositoryCollaboratorsForPullRequestsDocument = gql`
  query repositoryCollaboratorsForPullRequests(
    $owner: String!
    $name: String!
    $pullRequestNumber: Int!
    $searchQuery: String
  ) {
    repository(owner: $owner, name: $name) {
      collaborators(first: 25, query: $searchQuery) {
        totalCount
        nodes {
          ... on User {
            ...UserFields
          }
        }
      }
      pullRequest(number: $pullRequestNumber) {
        assignees(first: 25) {
          totalCount
          nodes {
            id
          }
        }
      }
    }
  }
  ${UserFieldsFragmentDoc}
`;
export const RepositoryProjectsForPullRequestsDocument = gql`
  query repositoryProjectsForPullRequests($owner: String!, $name: String!, $pullRequestNumber: Int!) {
    repository(owner: $owner, name: $name) {
      projectsV2(first: 50, orderBy: { field: TITLE, direction: ASC }) {
        totalCount
        nodes {
          id
          title
          number
        }
      }
      pullRequest(number: $pullRequestNumber) {
        projectsV2(first: 50) {
          totalCount
          nodes {
            id
          }
        }
      }
    }
  }
`;
export const PullRequestCommitsDocument = gql`
  query pullRequestCommits($nodeId: ID!) {
    node(id: $nodeId) {
      ...PullRequestCommitFields
    }
  }
  ${PullRequestCommitFieldsFragmentDoc}
`;
export const ClosePullRequestDocument = gql`
  mutation closePullRequest($nodeId: ID!) {
    closePullRequest(input: { pullRequestId: $nodeId }) {
      pullRequest {
        id
      }
    }
  }
`;
export const ReopenPullRequestDocument = gql`
  mutation reopenPullRequest($nodeId: ID!) {
    reopenPullRequest(input: { pullRequestId: $nodeId }) {
      pullRequest {
        id
      }
    }
  }
`;
export const MarkPullRequestReadyForReviewDocument = gql`
  mutation markPullRequestReadyForReview($nodeId: ID!) {
    markPullRequestReadyForReview(input: { pullRequestId: $nodeId }) {
      pullRequest {
        id
      }
    }
  }
`;
export const AddPullRequestReviewDocument = gql`
  mutation addPullRequestReview($nodeId: ID!, $event: PullRequestReviewEvent, $body: String) {
    addPullRequestReview(input: { pullRequestId: $nodeId, event: $event, body: $body }) {
      pullRequestReview {
        id
      }
    }
  }
`;
export const ChangePullRequestAssigneesDocument = gql`
  mutation changePullRequestAssignees($pullRequestId: ID!, $assigneeIds: [ID!]) {
    updatePullRequest(input: { pullRequestId: $pullRequestId, assigneeIds: $assigneeIds }) {
      clientMutationId
    }
  }
`;
export const ChangePullRequestMilestoneDocument = gql`
  mutation changePullRequestMilestone($pullRequestId: ID!, $milestoneId: ID) {
    updatePullRequest(input: { pullRequestId: $pullRequestId, milestoneId: $milestoneId }) {
      clientMutationId
    }
  }
`;
export const AddPullRequestToProjectDocument = gql`
  mutation addPullRequestToProject($pullRequestId: ID!, $projectId: ID!) {
    addProjectV2ItemById(input: { projectId: $projectId, contentId: $pullRequestId }) {
      clientMutationId
    }
  }
`;
export const RequestReviewDocument = gql`
  mutation requestReview($pullRequestId: ID!, $collaboratorId: ID!) {
    requestReviews(input: { pullRequestId: $pullRequestId, userIds: [$collaboratorId], union: true }) {
      clientMutationId
    }
  }
`;
export const MergePullRequestDocument = gql`
  mutation mergePullRequest($nodeId: ID!, $method: PullRequestMergeMethod!) {
    mergePullRequest(input: { pullRequestId: $nodeId, mergeMethod: $method }) {
      pullRequest {
        nodeId: id
      }
    }
  }
`;
export const AddPullRequestToMergeQueueDocument = gql`
  mutation addPullRequestToMergeQueue($nodeId: ID!) {
    enqueuePullRequest(input: { pullRequestId: $nodeId }) {
      __typename
    }
  }
`;
export const RemovePullRequestFromMergeQueueDocument = gql`
  mutation removePullRequestFromMergeQueue($nodeId: ID!) {
    dequeuePullRequest(input: { id: $nodeId }) {
      __typename
    }
  }
`;
export const EnablePullRequestAutoMergeDocument = gql`
  mutation enablePullRequestAutoMerge($nodeId: ID!, $mergeMethod: PullRequestMergeMethod) {
    enablePullRequestAutoMerge(input: { pullRequestId: $nodeId, mergeMethod: $mergeMethod }) {
      pullRequest {
        id
      }
    }
  }
`;
export const DisablePullRequestAutoMergeDocument = gql`
  mutation disablePullRequestAutoMerge($nodeId: ID!) {
    disablePullRequestAutoMerge(input: { pullRequestId: $nodeId }) {
      pullRequest {
        id
      }
    }
  }
`;
export const CreatePullRequestDocument = gql`
  mutation createPullRequest(
    $repositoryId: ID!
    $into: String!
    $from: String!
    $title: String!
    $body: String!
    $isDraft: Boolean!
  ) {
    createPullRequest(
      input: {
        repositoryId: $repositoryId
        baseRefName: $into
        headRefName: $from
        title: $title
        body: $body
        draft: $isDraft
      }
    ) {
      pullRequest {
        id
      }
    }
  }
`;
export const InitPullRequestDocument = gql`
  mutation initPullRequest(
    $pullRequestId: ID!
    $reviewersIds: [ID!]!
    $assigneeIds: [ID!]!
    $labelsIds: [ID!]!
    $milestoneId: ID
  ) {
    requestReviews(input: { pullRequestId: $pullRequestId, userIds: $reviewersIds }) {
      pullRequest {
        id
        reviewRequests {
          totalCount
        }
      }
    }
    updatePullRequest(
      input: {
        pullRequestId: $pullRequestId
        assigneeIds: $assigneeIds
        labelIds: $labelsIds
        milestoneId: $milestoneId
      }
    ) {
      pullRequest {
        ...PullRequestFields
      }
    }
  }
  ${PullRequestFieldsFragmentDoc}
`;
export const SearchRepositoriesDocument = gql`
  query searchRepositories($query: String!, $numberOfItems: Int!, $after: String) {
    search(query: $query, first: $numberOfItems, after: $after, type: REPOSITORY) {
      nodes {
        ...ExtendedRepositoryFields
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
  ${ExtendedRepositoryFieldsFragmentDoc}
`;
export const MyLatestRepositoriesDocument = gql`
  query myLatestRepositories(
    $numberOfItems: Int!
    $orderByField: RepositoryOrderField!
    $orderByDirection: OrderDirection!
  ) {
    viewer {
      repositories(first: $numberOfItems, orderBy: { field: $orderByField, direction: $orderByDirection }) {
        nodes {
          ...ExtendedRepositoryFields
        }
      }
    }
  }
  ${ExtendedRepositoryFieldsFragmentDoc}
`;
export const MilestonesForRepositoryDocument = gql`
  query milestonesForRepository($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      milestones(first: 25, orderBy: { field: DUE_DATE, direction: ASC }) {
        totalCount
        nodes {
          id
          title
          number
        }
      }
    }
  }
`;
export const CommentsForPullRequestDocument = gql`
  query commentsForPullRequest($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        comments(first: 100) {
          nodes {
            author {
              login
            }
            body
          }
        }
      }
    }
  }
`;
export const DataForRepositoryDocument = gql`
  query dataForRepository($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      defaultBranchRef {
        id
        name
        target {
          ...CommitFields
        }
      }
      issueTypes(orderBy: { direction: ASC, field: NAME }, first: 50) {
        totalCount
        nodes {
          id
          name
          color
          isEnabled
        }
      }
      refs(refPrefix: "refs/heads/", direction: ASC, first: 50) {
        totalCount
        nodes {
          id
          name
          target {
            ...CommitFields
          }
        }
      }
      collaborators(first: 50) {
        totalCount
        nodes {
          ...UserFields
        }
      }
      labels(first: 50) {
        totalCount
        nodes {
          id
          name
          color
          isDefault
        }
      }
      projectsV2(first: 50) {
        totalCount
        nodes {
          id
          title
        }
      }
      milestones(first: 50, states: OPEN, orderBy: { field: DUE_DATE, direction: ASC }) {
        totalCount
        nodes {
          id
          title
        }
      }
      owner {
        __typename
        ... on Organization {
          projectsV2(first: 50) {
            totalCount
            nodes {
              id
              title
            }
          }
        }
      }
      pullRequestTemplates {
        body
      }
      issueTemplates {
        name
        about
        title
        body
      }
    }
  }
  ${CommitFieldsFragmentDoc}
  ${UserFieldsFragmentDoc}
`;
export const SearchRepositoryBranchesDocument = gql`
  query searchRepositoryBranches($owner: String!, $name: String!, $query: String!) {
    repository(owner: $owner, name: $name) {
      refs(refPrefix: "refs/heads/", direction: ASC, first: 50, query: $query) {
        nodes {
          id
          name
          target {
            ...CommitFields
          }
        }
      }
    }
  }
  ${CommitFieldsFragmentDoc}
`;
export const RepositoryIssuesDocument = gql`
  query repositoryIssues($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      url
      defaultBranchRef {
        id
        name
        target {
          oid
        }
      }
      issues(first: 50, states: OPEN, orderBy: { field: CREATED_AT, direction: DESC }) {
        nodes {
          ...IssueFields
        }
      }
    }
  }
  ${IssueFieldsFragmentDoc}
`;
export const RepositoryReleasesDocument = gql`
  query repositoryReleases($name: String!, $owner: String!) {
    repository(name: $name, owner: $owner) {
      ... on Repository {
        releases(first: 30, orderBy: { field: CREATED_AT, direction: DESC }) {
          nodes {
            ...ReleaseFields
          }
        }
      }
    }
  }
  ${ReleaseFieldsFragmentDoc}
`;
export const AddStarDocument = gql`
  mutation addStar($repositoryId: ID!) {
    addStar(input: { starrableId: $repositoryId }) {
      clientMutationId
    }
  }
`;
export const RemoveStarDocument = gql`
  mutation removeStar($repositoryId: ID!) {
    removeStar(input: { starrableId: $repositoryId }) {
      clientMutationId
    }
  }
`;
export const MyStarredRepositoriesDocument = gql`
  query myStarredRepositories(
    $numberOfItems: Int!
    $after: String
    $orderByField: StarOrderField!
    $orderByDirection: OrderDirection!
  ) {
    viewer {
      starredRepositories(
        first: $numberOfItems
        after: $after
        orderBy: { field: $orderByField, direction: $orderByDirection }
      ) {
        nodes {
          ...ExtendedRepositoryFields
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
  ${ExtendedRepositoryFieldsFragmentDoc}
`;
export const GetViewerDocument = gql`
  query getViewer {
    viewer {
      ...UserFields
      organizations(first: 50) {
        totalCount
        nodes {
          avatarUrl
          login
        }
      }
      projectsV2(first: 50) {
        totalCount
        nodes {
          ...ProjectFields
        }
      }
    }
  }
  ${UserFieldsFragmentDoc}
  ${ProjectFieldsFragmentDoc}
`;
export const GetViewerStatsDocument = gql`
  query getViewerStats($repositoriesCount: Int = 100) {
    viewer {
      ...UserFields
      bio
      company
      location
      url
      websiteUrl
      createdAt
      followers {
        totalCount
      }
      following {
        totalCount
      }
      starredRepositories {
        totalCount
      }
      pullRequestsAuthored: pullRequests {
        totalCount
      }
      pullRequestsMerged: pullRequests(states: [MERGED]) {
        totalCount
      }
      pullRequestsOpen: pullRequests(states: [OPEN]) {
        totalCount
      }
      issuesAuthored: issues {
        totalCount
      }
      issuesOpen: issues(states: [OPEN]) {
        totalCount
      }
      recentPullRequests: pullRequests(first: 5, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes {
          id
          number
          title
          url
          state
          repository {
            nameWithOwner
          }
        }
      }
      recentOpenPullRequests: pullRequests(first: 5, states: [OPEN], orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes {
          id
          number
          title
          url
          repository {
            nameWithOwner
          }
        }
      }
      recentIssues: issues(first: 5, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes {
          id
          number
          title
          url
          state
          repository {
            nameWithOwner
          }
        }
      }
      recentOpenIssues: issues(first: 5, states: [OPEN], orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes {
          id
          number
          title
          url
          repository {
            nameWithOwner
          }
        }
      }
      contributionsCollection {
        totalCommitContributions
      }
      publicRepos: repositories(ownerAffiliations: OWNER, privacy: PUBLIC) {
        totalCount
      }
      ownedRepositories: repositories(
        first: $repositoriesCount
        ownerAffiliations: OWNER
        orderBy: { field: STARGAZERS, direction: DESC }
      ) {
        totalCount
        nodes {
          id
          nameWithOwner
          url
          stargazerCount
          forkCount
        }
      }
      organizations(first: 20) {
        totalCount
        nodes {
          id
          login
          name
          avatarUrl
          url
        }
      }
    }
    rateLimit {
      remaining
      limit
      used
      resetAt
    }
  }
  ${UserFieldsFragmentDoc}
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string,
  variables?: any,
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    createLinkedBranch(
      variables: CreateLinkedBranchMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<CreateLinkedBranchMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<CreateLinkedBranchMutation>({
            document: CreateLinkedBranchDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "createLinkedBranch",
        "mutation",
        variables,
      );
    },
    createRef(
      variables: CreateRefMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<CreateRefMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<CreateRefMutation>({
            document: CreateRefDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "createRef",
        "mutation",
        variables,
      );
    },
    deleteLinkedBranch(
      variables: DeleteLinkedBranchMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<DeleteLinkedBranchMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<DeleteLinkedBranchMutation>({
            document: DeleteLinkedBranchDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "deleteLinkedBranch",
        "mutation",
        variables,
      );
    },
    searchDiscussions(
      variables: SearchDiscussionsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<SearchDiscussionsQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<SearchDiscussionsQuery>({
            document: SearchDiscussionsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "searchDiscussions",
        "query",
        variables,
      );
    },
    getGitHubDiscussionNumber(
      variables: GetGitHubDiscussionNumberQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<GetGitHubDiscussionNumberQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<GetGitHubDiscussionNumberQuery>({
            document: GetGitHubDiscussionNumberDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "getGitHubDiscussionNumber",
        "query",
        variables,
      );
    },
    repositoryCollaboratorsForIssues(
      variables: RepositoryCollaboratorsForIssuesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<RepositoryCollaboratorsForIssuesQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<RepositoryCollaboratorsForIssuesQuery>({
            document: RepositoryCollaboratorsForIssuesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "repositoryCollaboratorsForIssues",
        "query",
        variables,
      );
    },
    repositoryProjectsForIssues(
      variables: RepositoryProjectsForIssuesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<RepositoryProjectsForIssuesQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<RepositoryProjectsForIssuesQuery>({
            document: RepositoryProjectsForIssuesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "repositoryProjectsForIssues",
        "query",
        variables,
      );
    },
    issueDetails(
      variables: IssueDetailsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<IssueDetailsQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<IssueDetailsQuery>({
            document: IssueDetailsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "issueDetails",
        "query",
        variables,
      );
    },
    searchIssues(
      variables: SearchIssuesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<SearchIssuesQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<SearchIssuesQuery>({
            document: SearchIssuesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "searchIssues",
        "query",
        variables,
      );
    },
    issueByNumber(
      variables: IssueByNumberQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<IssueByNumberQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<IssueByNumberQuery>({
            document: IssueByNumberDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "issueByNumber",
        "query",
        variables,
      );
    },
    closeIssue(
      variables: CloseIssueMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<CloseIssueMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<CloseIssueMutation>({
            document: CloseIssueDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "closeIssue",
        "mutation",
        variables,
      );
    },
    reopenIssue(
      variables: ReopenIssueMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<ReopenIssueMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ReopenIssueMutation>({
            document: ReopenIssueDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "reopenIssue",
        "mutation",
        variables,
      );
    },
    changeIssueAssignees(
      variables: ChangeIssueAssigneesMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<ChangeIssueAssigneesMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ChangeIssueAssigneesMutation>({
            document: ChangeIssueAssigneesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "changeIssueAssignees",
        "mutation",
        variables,
      );
    },
    changeIssueMilestone(
      variables: ChangeIssueMilestoneMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<ChangeIssueMilestoneMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ChangeIssueMilestoneMutation>({
            document: ChangeIssueMilestoneDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "changeIssueMilestone",
        "mutation",
        variables,
      );
    },
    addIssueToProject(
      variables: AddIssueToProjectMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<AddIssueToProjectMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<AddIssueToProjectMutation>({
            document: AddIssueToProjectDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "addIssueToProject",
        "mutation",
        variables,
      );
    },
    createIssue(
      variables: CreateIssueMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<CreateIssueMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<CreateIssueMutation>({
            document: CreateIssueDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "createIssue",
        "mutation",
        variables,
      );
    },
    changeProjectStatus(
      variables: ChangeProjectStatusMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<ChangeProjectStatusMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ChangeProjectStatusMutation>({
            document: ChangeProjectStatusDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "changeProjectStatus",
        "mutation",
        variables,
      );
    },
    projectDetails(
      variables: ProjectDetailsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<ProjectDetailsQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ProjectDetailsQuery>({
            document: ProjectDetailsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "projectDetails",
        "query",
        variables,
      );
    },
    searchPullRequests(
      variables: SearchPullRequestsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<SearchPullRequestsQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<SearchPullRequestsQuery>({
            document: SearchPullRequestsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "searchPullRequests",
        "query",
        variables,
      );
    },
    pullRequestDetails(
      variables: PullRequestDetailsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<PullRequestDetailsQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<PullRequestDetailsQuery>({
            document: PullRequestDetailsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "pullRequestDetails",
        "query",
        variables,
      );
    },
    repositoryCollaboratorsForPullRequests(
      variables: RepositoryCollaboratorsForPullRequestsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<RepositoryCollaboratorsForPullRequestsQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<RepositoryCollaboratorsForPullRequestsQuery>({
            document: RepositoryCollaboratorsForPullRequestsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "repositoryCollaboratorsForPullRequests",
        "query",
        variables,
      );
    },
    repositoryProjectsForPullRequests(
      variables: RepositoryProjectsForPullRequestsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<RepositoryProjectsForPullRequestsQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<RepositoryProjectsForPullRequestsQuery>({
            document: RepositoryProjectsForPullRequestsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "repositoryProjectsForPullRequests",
        "query",
        variables,
      );
    },
    pullRequestCommits(
      variables: PullRequestCommitsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<PullRequestCommitsQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<PullRequestCommitsQuery>({
            document: PullRequestCommitsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "pullRequestCommits",
        "query",
        variables,
      );
    },
    closePullRequest(
      variables: ClosePullRequestMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<ClosePullRequestMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ClosePullRequestMutation>({
            document: ClosePullRequestDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "closePullRequest",
        "mutation",
        variables,
      );
    },
    reopenPullRequest(
      variables: ReopenPullRequestMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<ReopenPullRequestMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ReopenPullRequestMutation>({
            document: ReopenPullRequestDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "reopenPullRequest",
        "mutation",
        variables,
      );
    },
    markPullRequestReadyForReview(
      variables: MarkPullRequestReadyForReviewMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<MarkPullRequestReadyForReviewMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<MarkPullRequestReadyForReviewMutation>({
            document: MarkPullRequestReadyForReviewDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "markPullRequestReadyForReview",
        "mutation",
        variables,
      );
    },
    addPullRequestReview(
      variables: AddPullRequestReviewMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<AddPullRequestReviewMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<AddPullRequestReviewMutation>({
            document: AddPullRequestReviewDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "addPullRequestReview",
        "mutation",
        variables,
      );
    },
    changePullRequestAssignees(
      variables: ChangePullRequestAssigneesMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<ChangePullRequestAssigneesMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ChangePullRequestAssigneesMutation>({
            document: ChangePullRequestAssigneesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "changePullRequestAssignees",
        "mutation",
        variables,
      );
    },
    changePullRequestMilestone(
      variables: ChangePullRequestMilestoneMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<ChangePullRequestMilestoneMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ChangePullRequestMilestoneMutation>({
            document: ChangePullRequestMilestoneDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "changePullRequestMilestone",
        "mutation",
        variables,
      );
    },
    addPullRequestToProject(
      variables: AddPullRequestToProjectMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<AddPullRequestToProjectMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<AddPullRequestToProjectMutation>({
            document: AddPullRequestToProjectDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "addPullRequestToProject",
        "mutation",
        variables,
      );
    },
    requestReview(
      variables: RequestReviewMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<RequestReviewMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<RequestReviewMutation>({
            document: RequestReviewDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "requestReview",
        "mutation",
        variables,
      );
    },
    mergePullRequest(
      variables: MergePullRequestMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<MergePullRequestMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<MergePullRequestMutation>({
            document: MergePullRequestDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "mergePullRequest",
        "mutation",
        variables,
      );
    },
    addPullRequestToMergeQueue(
      variables: AddPullRequestToMergeQueueMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<AddPullRequestToMergeQueueMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<AddPullRequestToMergeQueueMutation>({
            document: AddPullRequestToMergeQueueDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "addPullRequestToMergeQueue",
        "mutation",
        variables,
      );
    },
    removePullRequestFromMergeQueue(
      variables: RemovePullRequestFromMergeQueueMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<RemovePullRequestFromMergeQueueMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<RemovePullRequestFromMergeQueueMutation>({
            document: RemovePullRequestFromMergeQueueDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "removePullRequestFromMergeQueue",
        "mutation",
        variables,
      );
    },
    enablePullRequestAutoMerge(
      variables: EnablePullRequestAutoMergeMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<EnablePullRequestAutoMergeMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<EnablePullRequestAutoMergeMutation>({
            document: EnablePullRequestAutoMergeDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "enablePullRequestAutoMerge",
        "mutation",
        variables,
      );
    },
    disablePullRequestAutoMerge(
      variables: DisablePullRequestAutoMergeMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<DisablePullRequestAutoMergeMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<DisablePullRequestAutoMergeMutation>({
            document: DisablePullRequestAutoMergeDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "disablePullRequestAutoMerge",
        "mutation",
        variables,
      );
    },
    createPullRequest(
      variables: CreatePullRequestMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<CreatePullRequestMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<CreatePullRequestMutation>({
            document: CreatePullRequestDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "createPullRequest",
        "mutation",
        variables,
      );
    },
    initPullRequest(
      variables: InitPullRequestMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<InitPullRequestMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<InitPullRequestMutation>({
            document: InitPullRequestDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "initPullRequest",
        "mutation",
        variables,
      );
    },
    searchRepositories(
      variables: SearchRepositoriesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<SearchRepositoriesQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<SearchRepositoriesQuery>({
            document: SearchRepositoriesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "searchRepositories",
        "query",
        variables,
      );
    },
    myLatestRepositories(
      variables: MyLatestRepositoriesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<MyLatestRepositoriesQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<MyLatestRepositoriesQuery>({
            document: MyLatestRepositoriesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "myLatestRepositories",
        "query",
        variables,
      );
    },
    milestonesForRepository(
      variables: MilestonesForRepositoryQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<MilestonesForRepositoryQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<MilestonesForRepositoryQuery>({
            document: MilestonesForRepositoryDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "milestonesForRepository",
        "query",
        variables,
      );
    },
    commentsForPullRequest(
      variables: CommentsForPullRequestQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<CommentsForPullRequestQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<CommentsForPullRequestQuery>({
            document: CommentsForPullRequestDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "commentsForPullRequest",
        "query",
        variables,
      );
    },
    dataForRepository(
      variables: DataForRepositoryQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<DataForRepositoryQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<DataForRepositoryQuery>({
            document: DataForRepositoryDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "dataForRepository",
        "query",
        variables,
      );
    },
    searchRepositoryBranches(
      variables: SearchRepositoryBranchesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<SearchRepositoryBranchesQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<SearchRepositoryBranchesQuery>({
            document: SearchRepositoryBranchesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "searchRepositoryBranches",
        "query",
        variables,
      );
    },
    repositoryIssues(
      variables: RepositoryIssuesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<RepositoryIssuesQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<RepositoryIssuesQuery>({
            document: RepositoryIssuesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "repositoryIssues",
        "query",
        variables,
      );
    },
    repositoryReleases(
      variables: RepositoryReleasesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<RepositoryReleasesQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<RepositoryReleasesQuery>({
            document: RepositoryReleasesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "repositoryReleases",
        "query",
        variables,
      );
    },
    addStar(
      variables: AddStarMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<AddStarMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<AddStarMutation>({
            document: AddStarDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "addStar",
        "mutation",
        variables,
      );
    },
    removeStar(
      variables: RemoveStarMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<RemoveStarMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<RemoveStarMutation>({
            document: RemoveStarDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "removeStar",
        "mutation",
        variables,
      );
    },
    myStarredRepositories(
      variables: MyStarredRepositoriesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<MyStarredRepositoriesQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<MyStarredRepositoriesQuery>({
            document: MyStarredRepositoriesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "myStarredRepositories",
        "query",
        variables,
      );
    },
    getViewer(
      variables?: GetViewerQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<GetViewerQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<GetViewerQuery>({
            document: GetViewerDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "getViewer",
        "query",
        variables,
      );
    },
    getViewerStats(
      variables?: GetViewerStatsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<GetViewerStatsQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<GetViewerStatsQuery>({
            document: GetViewerStatsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "getViewerStats",
        "query",
        variables,
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
export * from "./schema";
