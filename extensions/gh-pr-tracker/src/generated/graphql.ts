/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
/** The possible states of a pull request review. */
export type PullRequestReviewState =
  /** A review allowing the pull request to merge. */
  | "APPROVED"
  /** A review blocking the pull request from merging. */
  | "CHANGES_REQUESTED"
  /** An informational review. */
  | "COMMENTED"
  /** A review that has been dismissed. */
  | "DISMISSED"
  /** A review that has not yet been submitted. */
  | "PENDING";

/** The possible states of a pull request. */
export type PullRequestState =
  /** A pull request that has been closed without being merged. */
  | "CLOSED"
  /** A pull request that has been closed by being merged. */
  | "MERGED"
  /** A pull request that is still open. */
  | "OPEN";

type ActorFields_Bot_Fragment = { login: string; avatarUrl: string };

type ActorFields_EnterpriseUserAccount_Fragment = { login: string; avatarUrl: string };

type ActorFields_Mannequin_Fragment = { login: string; avatarUrl: string };

type ActorFields_Organization_Fragment = { login: string; avatarUrl: string };

type ActorFields_User_Fragment = { login: string; avatarUrl: string };

export type ActorFieldsFragment =
  | ActorFields_Bot_Fragment
  | ActorFields_EnterpriseUserAccount_Fragment
  | ActorFields_Mannequin_Fragment
  | ActorFields_Organization_Fragment
  | ActorFields_User_Fragment;

export type PrActivityFieldsFragment = {
  number: number;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  state: PullRequestState;
  author:
    | { login: string; avatarUrl: string }
    | { login: string; avatarUrl: string }
    | { login: string; avatarUrl: string }
    | { login: string; avatarUrl: string }
    | { login: string; avatarUrl: string }
    | null;
  assignees: {
    totalCount: number;
    nodes: Array<{ login: string; avatarUrl: string } | null> | null;
  };
  reviewRequests: {
    totalCount: number;
    nodes: Array<{
      requestedReviewer: { __typename: "Team" } | { __typename: "User"; login: string; avatarUrl: string } | null;
    } | null> | null;
  } | null;
  labels: {
    totalCount: number;
    nodes: Array<{ name: string; color: string } | null> | null;
  } | null;
  isDraft: boolean;
  comments: {
    totalCount: number;
    nodes: Array<{
      fullDatabaseId: string | null;
      body: string;
      createdAt: string;
      updatedAt: string;
      url: string;
      author:
        | { login: string; avatarUrl: string }
        | { login: string; avatarUrl: string }
        | { login: string; avatarUrl: string }
        | { login: string; avatarUrl: string }
        | { login: string; avatarUrl: string }
        | null;
    } | null> | null;
  };
  reviews: {
    totalCount: number;
    nodes: Array<{
      fullDatabaseId: string | null;
      state: PullRequestReviewState;
      body: string;
      submittedAt: string | null;
      url: string;
      author:
        | { login: string; avatarUrl: string }
        | { login: string; avatarUrl: string }
        | { login: string; avatarUrl: string }
        | { login: string; avatarUrl: string }
        | { login: string; avatarUrl: string }
        | null;
    } | null> | null;
  } | null;
  reviewThreads: {
    totalCount: number;
    nodes: Array<{
      comments: {
        totalCount: number;
        nodes: Array<{
          fullDatabaseId: string | null;
          body: string;
          path: string;
          line: number | null;
          originalLine: number | null;
          diffHunk: string;
          createdAt: string;
          updatedAt: string;
          url: string;
          author:
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | null;
          replyTo: { fullDatabaseId: string | null } | null;
          pullRequestReview: { fullDatabaseId: string | null } | null;
        } | null> | null;
      };
    } | null> | null;
  };
  commits: {
    totalCount: number;
    nodes: Array<{
      commit: {
        oid: string;
        message: string;
        committedDate: string;
        url: string;
        author: { name: string | null; date: unknown; user: { login: string; avatarUrl: string } | null } | null;
      };
    } | null> | null;
  };
  timelineItems: {
    totalCount: number;
    nodes: Array<
      | { __typename: "AddedToMergeQueueEvent" }
      | { __typename: "AddedToProjectEvent" }
      | { __typename: "AddedToProjectV2Event" }
      | { __typename: "AssignedEvent" }
      | { __typename: "AutoMergeDisabledEvent" }
      | { __typename: "AutoMergeEnabledEvent" }
      | { __typename: "AutoRebaseEnabledEvent" }
      | { __typename: "AutoSquashEnabledEvent" }
      | { __typename: "AutomaticBaseChangeFailedEvent" }
      | { __typename: "AutomaticBaseChangeSucceededEvent" }
      | { __typename: "BaseRefChangedEvent" }
      | { __typename: "BaseRefDeletedEvent" }
      | { __typename: "BaseRefForcePushedEvent" }
      | { __typename: "BlockedByAddedEvent" }
      | { __typename: "BlockedByRemovedEvent" }
      | { __typename: "BlockingAddedEvent" }
      | { __typename: "BlockingRemovedEvent" }
      | { __typename: "ClosedEvent" }
      | { __typename: "CommentDeletedEvent" }
      | { __typename: "ConnectedEvent" }
      | { __typename: "ConvertToDraftEvent" }
      | { __typename: "ConvertedFromDraftEvent" }
      | { __typename: "ConvertedNoteToIssueEvent" }
      | { __typename: "ConvertedToDiscussionEvent" }
      | { __typename: "CrossReferencedEvent" }
      | { __typename: "DemilestonedEvent" }
      | { __typename: "DeployedEvent" }
      | { __typename: "DeploymentEnvironmentChangedEvent" }
      | { __typename: "DisconnectedEvent" }
      | { __typename: "HeadRefDeletedEvent" }
      | {
          __typename: "HeadRefForcePushedEvent";
          createdAt: string;
          actor:
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | null;
        }
      | { __typename: "HeadRefRestoredEvent" }
      | { __typename: "IssueComment" }
      | { __typename: "IssueCommentPinnedEvent" }
      | { __typename: "IssueCommentUnpinnedEvent" }
      | { __typename: "IssueFieldAddedEvent" }
      | { __typename: "IssueFieldChangedEvent" }
      | { __typename: "IssueFieldRemovedEvent" }
      | { __typename: "IssueTypeAddedEvent" }
      | { __typename: "IssueTypeChangedEvent" }
      | { __typename: "IssueTypeRemovedEvent" }
      | {
          __typename: "LabeledEvent";
          createdAt: string;
          actor:
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | null;
          label: { name: string; color: string };
        }
      | { __typename: "LockedEvent" }
      | { __typename: "MarkedAsDuplicateEvent" }
      | { __typename: "MentionedEvent" }
      | { __typename: "MergedEvent" }
      | { __typename: "MilestonedEvent" }
      | { __typename: "MovedColumnsInProjectEvent" }
      | { __typename: "ParentIssueAddedEvent" }
      | { __typename: "ParentIssueRemovedEvent" }
      | { __typename: "PinnedEvent" }
      | { __typename: "ProjectV2ItemStatusChangedEvent" }
      | { __typename: "PullRequestCommit" }
      | { __typename: "PullRequestCommitCommentThread" }
      | { __typename: "PullRequestReview" }
      | { __typename: "PullRequestReviewThread" }
      | { __typename: "PullRequestRevisionMarker" }
      | { __typename: "ReadyForReviewEvent" }
      | { __typename: "ReferencedEvent" }
      | { __typename: "RemovedFromMergeQueueEvent" }
      | { __typename: "RemovedFromProjectEvent" }
      | { __typename: "RemovedFromProjectV2Event" }
      | { __typename: "RenamedTitleEvent" }
      | { __typename: "ReopenedEvent" }
      | { __typename: "ReviewDismissedEvent" }
      | { __typename: "ReviewRequestRemovedEvent" }
      | { __typename: "ReviewRequestedEvent" }
      | { __typename: "SubIssueAddedEvent" }
      | { __typename: "SubIssueRemovedEvent" }
      | { __typename: "SubscribedEvent" }
      | { __typename: "TransferredEvent" }
      | { __typename: "UnassignedEvent" }
      | {
          __typename: "UnlabeledEvent";
          createdAt: string;
          actor:
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | null;
          label: { name: string; color: string };
        }
      | { __typename: "UnlockedEvent" }
      | { __typename: "UnmarkedAsDuplicateEvent" }
      | { __typename: "UnpinnedEvent" }
      | { __typename: "UnsubscribedEvent" }
      | { __typename: "UserBlockedEvent" }
      | null
    > | null;
  };
};

export type PrMetadataQueryVariables = Exact<{
  owner: string;
  name: string;
  first: number;
  after?: string | null | undefined;
}>;

export type PrMetadataQuery = {
  rateLimit: { cost: number; remaining: number; nodeCount: number } | null;
  repository: {
    pullRequests: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: Array<{ number: number; updatedAt: string } | null> | null;
    };
  } | null;
};

export type PrActivityQueryVariables = Exact<{
  owner: string;
  name: string;
  first: number;
  after?: string | null | undefined;
}>;

export type PrActivityQuery = {
  rateLimit: { cost: number; remaining: number; nodeCount: number } | null;
  repository: {
    pullRequests: {
      totalCount: number;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: Array<{
        number: number;
        title: string;
        url: string;
        createdAt: string;
        updatedAt: string;
        state: PullRequestState;
        author:
          | { login: string; avatarUrl: string }
          | { login: string; avatarUrl: string }
          | { login: string; avatarUrl: string }
          | { login: string; avatarUrl: string }
          | { login: string; avatarUrl: string }
          | null;
        comments: {
          totalCount: number;
          nodes: Array<{
            fullDatabaseId: string | null;
            body: string;
            createdAt: string;
            updatedAt: string;
            url: string;
            author:
              | { login: string; avatarUrl: string }
              | { login: string; avatarUrl: string }
              | { login: string; avatarUrl: string }
              | { login: string; avatarUrl: string }
              | { login: string; avatarUrl: string }
              | null;
          } | null> | null;
        };
        reviews: {
          totalCount: number;
          nodes: Array<{
            fullDatabaseId: string | null;
            state: PullRequestReviewState;
            body: string;
            submittedAt: string | null;
            url: string;
            author:
              | { login: string; avatarUrl: string }
              | { login: string; avatarUrl: string }
              | { login: string; avatarUrl: string }
              | { login: string; avatarUrl: string }
              | { login: string; avatarUrl: string }
              | null;
          } | null> | null;
        } | null;
        reviewThreads: {
          totalCount: number;
          nodes: Array<{
            comments: {
              totalCount: number;
              nodes: Array<{
                fullDatabaseId: string | null;
                body: string;
                path: string;
                line: number | null;
                originalLine: number | null;
                diffHunk: string;
                createdAt: string;
                updatedAt: string;
                url: string;
                author:
                  | { login: string; avatarUrl: string }
                  | { login: string; avatarUrl: string }
                  | { login: string; avatarUrl: string }
                  | { login: string; avatarUrl: string }
                  | { login: string; avatarUrl: string }
                  | null;
                replyTo: { fullDatabaseId: string | null } | null;
                pullRequestReview: { fullDatabaseId: string | null } | null;
              } | null> | null;
            };
          } | null> | null;
        };
        commits: {
          totalCount: number;
          nodes: Array<{
            commit: {
              oid: string;
              message: string;
              committedDate: string;
              url: string;
              author: { name: string | null; date: unknown; user: { login: string; avatarUrl: string } | null } | null;
            };
          } | null> | null;
        };
        timelineItems: {
          totalCount: number;
          nodes: Array<
            | { __typename: "AddedToMergeQueueEvent" }
            | { __typename: "AddedToProjectEvent" }
            | { __typename: "AddedToProjectV2Event" }
            | { __typename: "AssignedEvent" }
            | { __typename: "AutoMergeDisabledEvent" }
            | { __typename: "AutoMergeEnabledEvent" }
            | { __typename: "AutoRebaseEnabledEvent" }
            | { __typename: "AutoSquashEnabledEvent" }
            | { __typename: "AutomaticBaseChangeFailedEvent" }
            | { __typename: "AutomaticBaseChangeSucceededEvent" }
            | { __typename: "BaseRefChangedEvent" }
            | { __typename: "BaseRefDeletedEvent" }
            | { __typename: "BaseRefForcePushedEvent" }
            | { __typename: "BlockedByAddedEvent" }
            | { __typename: "BlockedByRemovedEvent" }
            | { __typename: "BlockingAddedEvent" }
            | { __typename: "BlockingRemovedEvent" }
            | { __typename: "ClosedEvent" }
            | { __typename: "CommentDeletedEvent" }
            | { __typename: "ConnectedEvent" }
            | { __typename: "ConvertToDraftEvent" }
            | { __typename: "ConvertedFromDraftEvent" }
            | { __typename: "ConvertedNoteToIssueEvent" }
            | { __typename: "ConvertedToDiscussionEvent" }
            | { __typename: "CrossReferencedEvent" }
            | { __typename: "DemilestonedEvent" }
            | { __typename: "DeployedEvent" }
            | { __typename: "DeploymentEnvironmentChangedEvent" }
            | { __typename: "DisconnectedEvent" }
            | { __typename: "HeadRefDeletedEvent" }
            | {
                __typename: "HeadRefForcePushedEvent";
                createdAt: string;
                actor:
                  | { login: string; avatarUrl: string }
                  | { login: string; avatarUrl: string }
                  | { login: string; avatarUrl: string }
                  | { login: string; avatarUrl: string }
                  | { login: string; avatarUrl: string }
                  | null;
              }
            | { __typename: "HeadRefRestoredEvent" }
            | { __typename: "IssueComment" }
            | { __typename: "IssueCommentPinnedEvent" }
            | { __typename: "IssueCommentUnpinnedEvent" }
            | { __typename: "IssueFieldAddedEvent" }
            | { __typename: "IssueFieldChangedEvent" }
            | { __typename: "IssueFieldRemovedEvent" }
            | { __typename: "IssueTypeAddedEvent" }
            | { __typename: "IssueTypeChangedEvent" }
            | { __typename: "IssueTypeRemovedEvent" }
            | {
                __typename: "LabeledEvent";
                createdAt: string;
                actor:
                  | { login: string; avatarUrl: string }
                  | { login: string; avatarUrl: string }
                  | { login: string; avatarUrl: string }
                  | { login: string; avatarUrl: string }
                  | { login: string; avatarUrl: string }
                  | null;
                label: { name: string; color: string };
              }
            | { __typename: "LockedEvent" }
            | { __typename: "MarkedAsDuplicateEvent" }
            | { __typename: "MentionedEvent" }
            | { __typename: "MergedEvent" }
            | { __typename: "MilestonedEvent" }
            | { __typename: "MovedColumnsInProjectEvent" }
            | { __typename: "ParentIssueAddedEvent" }
            | { __typename: "ParentIssueRemovedEvent" }
            | { __typename: "PinnedEvent" }
            | { __typename: "ProjectV2ItemStatusChangedEvent" }
            | { __typename: "PullRequestCommit" }
            | { __typename: "PullRequestCommitCommentThread" }
            | { __typename: "PullRequestReview" }
            | { __typename: "PullRequestReviewThread" }
            | { __typename: "PullRequestRevisionMarker" }
            | { __typename: "ReadyForReviewEvent" }
            | { __typename: "ReferencedEvent" }
            | { __typename: "RemovedFromMergeQueueEvent" }
            | { __typename: "RemovedFromProjectEvent" }
            | { __typename: "RemovedFromProjectV2Event" }
            | { __typename: "RenamedTitleEvent" }
            | { __typename: "ReopenedEvent" }
            | { __typename: "ReviewDismissedEvent" }
            | { __typename: "ReviewRequestRemovedEvent" }
            | { __typename: "ReviewRequestedEvent" }
            | { __typename: "SubIssueAddedEvent" }
            | { __typename: "SubIssueRemovedEvent" }
            | { __typename: "SubscribedEvent" }
            | { __typename: "TransferredEvent" }
            | { __typename: "UnassignedEvent" }
            | {
                __typename: "UnlabeledEvent";
                createdAt: string;
                actor:
                  | { login: string; avatarUrl: string }
                  | { login: string; avatarUrl: string }
                  | { login: string; avatarUrl: string }
                  | { login: string; avatarUrl: string }
                  | { login: string; avatarUrl: string }
                  | null;
                label: { name: string; color: string };
              }
            | { __typename: "UnlockedEvent" }
            | { __typename: "UnmarkedAsDuplicateEvent" }
            | { __typename: "UnpinnedEvent" }
            | { __typename: "UnsubscribedEvent" }
            | { __typename: "UserBlockedEvent" }
            | null
          > | null;
        };
      } | null> | null;
    };
  } | null;
};

export type PrActivityByNumberQueryVariables = Exact<{
  owner: string;
  name: string;
  number: number;
}>;

export type PrActivityByNumberQuery = {
  rateLimit: { cost: number; remaining: number; nodeCount: number } | null;
  repository: {
    pullRequest: {
      number: number;
      title: string;
      url: string;
      createdAt: string;
      updatedAt: string;
      state: PullRequestState;
      author:
        | { login: string; avatarUrl: string }
        | { login: string; avatarUrl: string }
        | { login: string; avatarUrl: string }
        | { login: string; avatarUrl: string }
        | { login: string; avatarUrl: string }
        | null;
      comments: {
        totalCount: number;
        nodes: Array<{
          fullDatabaseId: string | null;
          body: string;
          createdAt: string;
          updatedAt: string;
          url: string;
          author:
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | null;
        } | null> | null;
      };
      reviews: {
        totalCount: number;
        nodes: Array<{
          fullDatabaseId: string | null;
          state: PullRequestReviewState;
          body: string;
          submittedAt: string | null;
          url: string;
          author:
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | null;
        } | null> | null;
      } | null;
      reviewThreads: {
        totalCount: number;
        nodes: Array<{
          comments: {
            totalCount: number;
            nodes: Array<{
              fullDatabaseId: string | null;
              body: string;
              path: string;
              line: number | null;
              originalLine: number | null;
              diffHunk: string;
              createdAt: string;
              updatedAt: string;
              url: string;
              author:
                | { login: string; avatarUrl: string }
                | { login: string; avatarUrl: string }
                | { login: string; avatarUrl: string }
                | { login: string; avatarUrl: string }
                | { login: string; avatarUrl: string }
                | null;
              replyTo: { fullDatabaseId: string | null } | null;
              pullRequestReview: { fullDatabaseId: string | null } | null;
            } | null> | null;
          };
        } | null> | null;
      };
      commits: {
        totalCount: number;
        nodes: Array<{
          commit: {
            oid: string;
            message: string;
            committedDate: string;
            url: string;
            author: { name: string | null; date: unknown; user: { login: string; avatarUrl: string } | null } | null;
          };
        } | null> | null;
      };
      timelineItems: {
        totalCount: number;
        nodes: Array<
          | { __typename: "AddedToMergeQueueEvent" }
          | { __typename: "AddedToProjectEvent" }
          | { __typename: "AddedToProjectV2Event" }
          | { __typename: "AssignedEvent" }
          | { __typename: "AutoMergeDisabledEvent" }
          | { __typename: "AutoMergeEnabledEvent" }
          | { __typename: "AutoRebaseEnabledEvent" }
          | { __typename: "AutoSquashEnabledEvent" }
          | { __typename: "AutomaticBaseChangeFailedEvent" }
          | { __typename: "AutomaticBaseChangeSucceededEvent" }
          | { __typename: "BaseRefChangedEvent" }
          | { __typename: "BaseRefDeletedEvent" }
          | { __typename: "BaseRefForcePushedEvent" }
          | { __typename: "BlockedByAddedEvent" }
          | { __typename: "BlockedByRemovedEvent" }
          | { __typename: "BlockingAddedEvent" }
          | { __typename: "BlockingRemovedEvent" }
          | { __typename: "ClosedEvent" }
          | { __typename: "CommentDeletedEvent" }
          | { __typename: "ConnectedEvent" }
          | { __typename: "ConvertToDraftEvent" }
          | { __typename: "ConvertedFromDraftEvent" }
          | { __typename: "ConvertedNoteToIssueEvent" }
          | { __typename: "ConvertedToDiscussionEvent" }
          | { __typename: "CrossReferencedEvent" }
          | { __typename: "DemilestonedEvent" }
          | { __typename: "DeployedEvent" }
          | { __typename: "DeploymentEnvironmentChangedEvent" }
          | { __typename: "DisconnectedEvent" }
          | { __typename: "HeadRefDeletedEvent" }
          | {
              __typename: "HeadRefForcePushedEvent";
              createdAt: string;
              actor:
                | { login: string; avatarUrl: string }
                | { login: string; avatarUrl: string }
                | { login: string; avatarUrl: string }
                | { login: string; avatarUrl: string }
                | { login: string; avatarUrl: string }
                | null;
            }
          | { __typename: "HeadRefRestoredEvent" }
          | { __typename: "IssueComment" }
          | { __typename: "IssueCommentPinnedEvent" }
          | { __typename: "IssueCommentUnpinnedEvent" }
          | { __typename: "IssueFieldAddedEvent" }
          | { __typename: "IssueFieldChangedEvent" }
          | { __typename: "IssueFieldRemovedEvent" }
          | { __typename: "IssueTypeAddedEvent" }
          | { __typename: "IssueTypeChangedEvent" }
          | { __typename: "IssueTypeRemovedEvent" }
          | {
              __typename: "LabeledEvent";
              createdAt: string;
              actor:
                | { login: string; avatarUrl: string }
                | { login: string; avatarUrl: string }
                | { login: string; avatarUrl: string }
                | { login: string; avatarUrl: string }
                | { login: string; avatarUrl: string }
                | null;
              label: { name: string; color: string };
            }
          | { __typename: "LockedEvent" }
          | { __typename: "MarkedAsDuplicateEvent" }
          | { __typename: "MentionedEvent" }
          | { __typename: "MergedEvent" }
          | { __typename: "MilestonedEvent" }
          | { __typename: "MovedColumnsInProjectEvent" }
          | { __typename: "ParentIssueAddedEvent" }
          | { __typename: "ParentIssueRemovedEvent" }
          | { __typename: "PinnedEvent" }
          | { __typename: "ProjectV2ItemStatusChangedEvent" }
          | { __typename: "PullRequestCommit" }
          | { __typename: "PullRequestCommitCommentThread" }
          | { __typename: "PullRequestReview" }
          | { __typename: "PullRequestReviewThread" }
          | { __typename: "PullRequestRevisionMarker" }
          | { __typename: "ReadyForReviewEvent" }
          | { __typename: "ReferencedEvent" }
          | { __typename: "RemovedFromMergeQueueEvent" }
          | { __typename: "RemovedFromProjectEvent" }
          | { __typename: "RemovedFromProjectV2Event" }
          | { __typename: "RenamedTitleEvent" }
          | { __typename: "ReopenedEvent" }
          | { __typename: "ReviewDismissedEvent" }
          | { __typename: "ReviewRequestRemovedEvent" }
          | { __typename: "ReviewRequestedEvent" }
          | { __typename: "SubIssueAddedEvent" }
          | { __typename: "SubIssueRemovedEvent" }
          | { __typename: "SubscribedEvent" }
          | { __typename: "TransferredEvent" }
          | { __typename: "UnassignedEvent" }
          | {
              __typename: "UnlabeledEvent";
              createdAt: string;
              actor:
                | { login: string; avatarUrl: string }
                | { login: string; avatarUrl: string }
                | { login: string; avatarUrl: string }
                | { login: string; avatarUrl: string }
                | { login: string; avatarUrl: string }
                | null;
              label: { name: string; color: string };
            }
          | { __typename: "UnlockedEvent" }
          | { __typename: "UnmarkedAsDuplicateEvent" }
          | { __typename: "UnpinnedEvent" }
          | { __typename: "UnsubscribedEvent" }
          | { __typename: "UserBlockedEvent" }
          | null
        > | null;
      };
    } | null;
  } | null;
};
