import * as Types from "../schema.generated";

import { GraphQLClient } from "graphql-request";
import * as Dom from "graphql-request/dist/types.dom";
import gql from "graphql-tag";
export type PullRequestFieldsFragment = {
  __typename?: "PullRequest";
  permalink: string;
  title: string;
  number: number;
  isDraft: boolean;
  reviewDecision?: Types.PullRequestReviewDecision | null;
  nodeId: string;
  isMerged: boolean;
  isClosed: boolean;
  mergingState: Types.MergeableState;
  date: string;
  createdDate: string;
  updatedDate: string;
  fromBranch?: {
    __typename?: "Ref";
    name: string;
    nodeId: string;
    commit?:
      | { __typename?: "Blob" }
      | { __typename?: "Commit"; message: string; date: string; sha: any }
      | { __typename?: "Tag" }
      | { __typename?: "Tree" }
      | null;
  } | null;
  author?:
    | {
        __typename?: "Bot";
        nodeId: string;
        githubUsername: string;
        avatarURL: string;
      }
    | {
        __typename?: "EnterpriseUserAccount";
        name?: string | null;
        nodeId: string;
        githubUsername: string;
        avatarURL: string;
      }
    | {
        __typename?: "Mannequin";
        nodeId: string;
        githubUsername: string;
        avatarURL: string;
      }
    | {
        __typename?: "Organization";
        name?: string | null;
        nodeId: string;
        githubUsername: string;
        avatarURL: string;
      }
    | {
        __typename?: "User";
        name?: string | null;
        nodeId: string;
        githubUsername: string;
        avatarURL: string;
      }
    | null;
  milestone?: {
    __typename?: "Milestone";
    title: string;
    number: number;
    nodeId: string;
  } | null;
  repository: {
    __typename?: "Repository";
    name: string;
    url: string;
    hasIssuesEnabled: boolean;
    isArchived: boolean;
    isDisabled: boolean;
    isLocked: boolean;
    mergeCommitAllowed: boolean;
    squashMergeAllowed: boolean;
    rebaseMergeAllowed: boolean;
    deleteBranchOnMerge: boolean;
    id?: number | null;
    nodeId: string;
    date: string;
    isStarred: boolean;
    numberOfStars: number;
    owner:
      | {
          __typename?: "Organization";
          githubUsername: string;
          avatarURL: string;
        }
      | { __typename?: "User"; githubUsername: string; avatarURL: string };
    primaryLanguage?: {
      __typename?: "Language";
      name: string;
      color?: string | null;
      nodeId: string;
    } | null;
  };
  commits: {
    __typename?: "PullRequestCommitConnection";
    totalCount: number;
    nodes?: Array<{
      __typename?: "PullRequestCommit";
      commit: {
        __typename?: "Commit";
        message: string;
        nodeId: string;
        hash: any;
        statusCheckRollup?: {
          __typename?: "StatusCheckRollup";
          state: Types.StatusState;
        } | null;
      };
    } | null> | null;
  };
  reviewRequests?: {
    __typename?: "ReviewRequestConnection";
    totalCount: number;
    nodes?: Array<{
      __typename?: "ReviewRequest";
      requestedReviewer?:
        | { __typename?: "Mannequin" }
        | { __typename?: "Team" }
        | { __typename?: "User"; isViewer: boolean }
        | null;
    } | null> | null;
  } | null;
  comments: { __typename?: "IssueCommentConnection"; totalCount: number };
  reviewThreads: {
    __typename?: "PullRequestReviewThreadConnection";
    totalCount: number;
    nodes?: Array<{
      __typename?: "PullRequestReviewThread";
      comments: {
        __typename?: "PullRequestReviewCommentConnection";
        totalCount: number;
      };
    } | null> | null;
  };
  reviews?: {
    __typename?: "PullRequestReviewConnection";
    totalCount: number;
    nodes?: Array<{
      __typename?: "PullRequestReview";
      bodyText: string;
    } | null> | null;
  } | null;
};

export type SearchPullRequestsQueryVariables = Types.Exact<{
  createdOpenQuery: Types.Scalars["String"];
  createdClosedQuery: Types.Scalars["String"];
  assignedOpenQuery: Types.Scalars["String"];
  assignedClosedQuery: Types.Scalars["String"];
  mentionedOpenQuery: Types.Scalars["String"];
  mentionedClosedQuery: Types.Scalars["String"];
  reviewRequestsOpenQuery: Types.Scalars["String"];
  reviewRequestsClosedQuery: Types.Scalars["String"];
  reviewedByOpenQuery: Types.Scalars["String"];
  reviewedByClosedQuery: Types.Scalars["String"];
  numberOfOpenItems: Types.Scalars["Int"];
  numberOfClosedItems: Types.Scalars["Int"];
  avatarSize: Types.Scalars["Int"];
}>;

export type SearchPullRequestsQuery = {
  __typename?: "Query";
  createdOpen: {
    __typename?: "SearchResultItemConnection";
    pullRequests?: Array<{
      __typename?: "SearchResultItemEdge";
      pullRequest?:
        | { __typename: "App" }
        | { __typename: "Discussion" }
        | { __typename: "Issue" }
        | { __typename: "MarketplaceListing" }
        | { __typename: "Organization" }
        | {
            __typename: "PullRequest";
            permalink: string;
            title: string;
            number: number;
            isDraft: boolean;
            reviewDecision?: Types.PullRequestReviewDecision | null;
            nodeId: string;
            isMerged: boolean;
            isClosed: boolean;
            mergingState: Types.MergeableState;
            date: string;
            createdDate: string;
            updatedDate: string;
            fromBranch?: {
              __typename?: "Ref";
              name: string;
              nodeId: string;
              commit?:
                | { __typename?: "Blob" }
                | {
                    __typename?: "Commit";
                    message: string;
                    date: string;
                    sha: any;
                  }
                | { __typename?: "Tag" }
                | { __typename?: "Tree" }
                | null;
            } | null;
            author?:
              | {
                  __typename?: "Bot";
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "EnterpriseUserAccount";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "Mannequin";
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "Organization";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "User";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | null;
            milestone?: {
              __typename?: "Milestone";
              title: string;
              number: number;
              nodeId: string;
            } | null;
            repository: {
              __typename?: "Repository";
              name: string;
              url: string;
              hasIssuesEnabled: boolean;
              isArchived: boolean;
              isDisabled: boolean;
              isLocked: boolean;
              mergeCommitAllowed: boolean;
              squashMergeAllowed: boolean;
              rebaseMergeAllowed: boolean;
              deleteBranchOnMerge: boolean;
              id?: number | null;
              nodeId: string;
              date: string;
              isStarred: boolean;
              numberOfStars: number;
              owner:
                | {
                    __typename?: "Organization";
                    githubUsername: string;
                    avatarURL: string;
                  }
                | {
                    __typename?: "User";
                    githubUsername: string;
                    avatarURL: string;
                  };
              primaryLanguage?: {
                __typename?: "Language";
                name: string;
                color?: string | null;
                nodeId: string;
              } | null;
            };
            commits: {
              __typename?: "PullRequestCommitConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestCommit";
                commit: {
                  __typename?: "Commit";
                  message: string;
                  nodeId: string;
                  hash: any;
                  statusCheckRollup?: {
                    __typename?: "StatusCheckRollup";
                    state: Types.StatusState;
                  } | null;
                };
              } | null> | null;
            };
            reviewRequests?: {
              __typename?: "ReviewRequestConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "ReviewRequest";
                requestedReviewer?:
                  | { __typename?: "Mannequin" }
                  | { __typename?: "Team" }
                  | { __typename?: "User"; isViewer: boolean }
                  | null;
              } | null> | null;
            } | null;
            comments: {
              __typename?: "IssueCommentConnection";
              totalCount: number;
            };
            reviewThreads: {
              __typename?: "PullRequestReviewThreadConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestReviewThread";
                comments: {
                  __typename?: "PullRequestReviewCommentConnection";
                  totalCount: number;
                };
              } | null> | null;
            };
            reviews?: {
              __typename?: "PullRequestReviewConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestReview";
                bodyText: string;
              } | null> | null;
            } | null;
          }
        | { __typename: "Repository" }
        | { __typename: "User" }
        | null;
    } | null> | null;
  };
  createdClosed: {
    __typename?: "SearchResultItemConnection";
    pullRequests?: Array<{
      __typename?: "SearchResultItemEdge";
      pullRequest?:
        | { __typename: "App" }
        | { __typename: "Discussion" }
        | { __typename: "Issue" }
        | { __typename: "MarketplaceListing" }
        | { __typename: "Organization" }
        | {
            __typename: "PullRequest";
            permalink: string;
            title: string;
            number: number;
            isDraft: boolean;
            reviewDecision?: Types.PullRequestReviewDecision | null;
            nodeId: string;
            isMerged: boolean;
            isClosed: boolean;
            mergingState: Types.MergeableState;
            date: string;
            createdDate: string;
            updatedDate: string;
            fromBranch?: {
              __typename?: "Ref";
              name: string;
              nodeId: string;
              commit?:
                | { __typename?: "Blob" }
                | {
                    __typename?: "Commit";
                    message: string;
                    date: string;
                    sha: any;
                  }
                | { __typename?: "Tag" }
                | { __typename?: "Tree" }
                | null;
            } | null;
            author?:
              | {
                  __typename?: "Bot";
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "EnterpriseUserAccount";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "Mannequin";
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "Organization";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "User";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | null;
            milestone?: {
              __typename?: "Milestone";
              title: string;
              number: number;
              nodeId: string;
            } | null;
            repository: {
              __typename?: "Repository";
              name: string;
              url: string;
              hasIssuesEnabled: boolean;
              isArchived: boolean;
              isDisabled: boolean;
              isLocked: boolean;
              mergeCommitAllowed: boolean;
              squashMergeAllowed: boolean;
              rebaseMergeAllowed: boolean;
              deleteBranchOnMerge: boolean;
              id?: number | null;
              nodeId: string;
              date: string;
              isStarred: boolean;
              numberOfStars: number;
              owner:
                | {
                    __typename?: "Organization";
                    githubUsername: string;
                    avatarURL: string;
                  }
                | {
                    __typename?: "User";
                    githubUsername: string;
                    avatarURL: string;
                  };
              primaryLanguage?: {
                __typename?: "Language";
                name: string;
                color?: string | null;
                nodeId: string;
              } | null;
            };
            commits: {
              __typename?: "PullRequestCommitConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestCommit";
                commit: {
                  __typename?: "Commit";
                  message: string;
                  nodeId: string;
                  hash: any;
                  statusCheckRollup?: {
                    __typename?: "StatusCheckRollup";
                    state: Types.StatusState;
                  } | null;
                };
              } | null> | null;
            };
            reviewRequests?: {
              __typename?: "ReviewRequestConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "ReviewRequest";
                requestedReviewer?:
                  | { __typename?: "Mannequin" }
                  | { __typename?: "Team" }
                  | { __typename?: "User"; isViewer: boolean }
                  | null;
              } | null> | null;
            } | null;
            comments: {
              __typename?: "IssueCommentConnection";
              totalCount: number;
            };
            reviewThreads: {
              __typename?: "PullRequestReviewThreadConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestReviewThread";
                comments: {
                  __typename?: "PullRequestReviewCommentConnection";
                  totalCount: number;
                };
              } | null> | null;
            };
            reviews?: {
              __typename?: "PullRequestReviewConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestReview";
                bodyText: string;
              } | null> | null;
            } | null;
          }
        | { __typename: "Repository" }
        | { __typename: "User" }
        | null;
    } | null> | null;
  };
  assignedOpen: {
    __typename?: "SearchResultItemConnection";
    pullRequests?: Array<{
      __typename?: "SearchResultItemEdge";
      pullRequest?:
        | { __typename: "App" }
        | { __typename: "Discussion" }
        | { __typename: "Issue" }
        | { __typename: "MarketplaceListing" }
        | { __typename: "Organization" }
        | {
            __typename: "PullRequest";
            permalink: string;
            title: string;
            number: number;
            isDraft: boolean;
            reviewDecision?: Types.PullRequestReviewDecision | null;
            nodeId: string;
            isMerged: boolean;
            isClosed: boolean;
            mergingState: Types.MergeableState;
            date: string;
            createdDate: string;
            updatedDate: string;
            fromBranch?: {
              __typename?: "Ref";
              name: string;
              nodeId: string;
              commit?:
                | { __typename?: "Blob" }
                | {
                    __typename?: "Commit";
                    message: string;
                    date: string;
                    sha: any;
                  }
                | { __typename?: "Tag" }
                | { __typename?: "Tree" }
                | null;
            } | null;
            author?:
              | {
                  __typename?: "Bot";
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "EnterpriseUserAccount";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "Mannequin";
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "Organization";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "User";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | null;
            milestone?: {
              __typename?: "Milestone";
              title: string;
              number: number;
              nodeId: string;
            } | null;
            repository: {
              __typename?: "Repository";
              name: string;
              url: string;
              hasIssuesEnabled: boolean;
              isArchived: boolean;
              isDisabled: boolean;
              isLocked: boolean;
              mergeCommitAllowed: boolean;
              squashMergeAllowed: boolean;
              rebaseMergeAllowed: boolean;
              deleteBranchOnMerge: boolean;
              id?: number | null;
              nodeId: string;
              date: string;
              isStarred: boolean;
              numberOfStars: number;
              owner:
                | {
                    __typename?: "Organization";
                    githubUsername: string;
                    avatarURL: string;
                  }
                | {
                    __typename?: "User";
                    githubUsername: string;
                    avatarURL: string;
                  };
              primaryLanguage?: {
                __typename?: "Language";
                name: string;
                color?: string | null;
                nodeId: string;
              } | null;
            };
            commits: {
              __typename?: "PullRequestCommitConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestCommit";
                commit: {
                  __typename?: "Commit";
                  message: string;
                  nodeId: string;
                  hash: any;
                  statusCheckRollup?: {
                    __typename?: "StatusCheckRollup";
                    state: Types.StatusState;
                  } | null;
                };
              } | null> | null;
            };
            reviewRequests?: {
              __typename?: "ReviewRequestConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "ReviewRequest";
                requestedReviewer?:
                  | { __typename?: "Mannequin" }
                  | { __typename?: "Team" }
                  | { __typename?: "User"; isViewer: boolean }
                  | null;
              } | null> | null;
            } | null;
            comments: {
              __typename?: "IssueCommentConnection";
              totalCount: number;
            };
            reviewThreads: {
              __typename?: "PullRequestReviewThreadConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestReviewThread";
                comments: {
                  __typename?: "PullRequestReviewCommentConnection";
                  totalCount: number;
                };
              } | null> | null;
            };
            reviews?: {
              __typename?: "PullRequestReviewConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestReview";
                bodyText: string;
              } | null> | null;
            } | null;
          }
        | { __typename: "Repository" }
        | { __typename: "User" }
        | null;
    } | null> | null;
  };
  assignedClosed: {
    __typename?: "SearchResultItemConnection";
    pullRequests?: Array<{
      __typename?: "SearchResultItemEdge";
      pullRequest?:
        | { __typename: "App" }
        | { __typename: "Discussion" }
        | { __typename: "Issue" }
        | { __typename: "MarketplaceListing" }
        | { __typename: "Organization" }
        | {
            __typename: "PullRequest";
            permalink: string;
            title: string;
            number: number;
            isDraft: boolean;
            reviewDecision?: Types.PullRequestReviewDecision | null;
            nodeId: string;
            isMerged: boolean;
            isClosed: boolean;
            mergingState: Types.MergeableState;
            date: string;
            createdDate: string;
            updatedDate: string;
            fromBranch?: {
              __typename?: "Ref";
              name: string;
              nodeId: string;
              commit?:
                | { __typename?: "Blob" }
                | {
                    __typename?: "Commit";
                    message: string;
                    date: string;
                    sha: any;
                  }
                | { __typename?: "Tag" }
                | { __typename?: "Tree" }
                | null;
            } | null;
            author?:
              | {
                  __typename?: "Bot";
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "EnterpriseUserAccount";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "Mannequin";
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "Organization";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "User";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | null;
            milestone?: {
              __typename?: "Milestone";
              title: string;
              number: number;
              nodeId: string;
            } | null;
            repository: {
              __typename?: "Repository";
              name: string;
              url: string;
              hasIssuesEnabled: boolean;
              isArchived: boolean;
              isDisabled: boolean;
              isLocked: boolean;
              mergeCommitAllowed: boolean;
              squashMergeAllowed: boolean;
              rebaseMergeAllowed: boolean;
              deleteBranchOnMerge: boolean;
              id?: number | null;
              nodeId: string;
              date: string;
              isStarred: boolean;
              numberOfStars: number;
              owner:
                | {
                    __typename?: "Organization";
                    githubUsername: string;
                    avatarURL: string;
                  }
                | {
                    __typename?: "User";
                    githubUsername: string;
                    avatarURL: string;
                  };
              primaryLanguage?: {
                __typename?: "Language";
                name: string;
                color?: string | null;
                nodeId: string;
              } | null;
            };
            commits: {
              __typename?: "PullRequestCommitConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestCommit";
                commit: {
                  __typename?: "Commit";
                  message: string;
                  nodeId: string;
                  hash: any;
                  statusCheckRollup?: {
                    __typename?: "StatusCheckRollup";
                    state: Types.StatusState;
                  } | null;
                };
              } | null> | null;
            };
            reviewRequests?: {
              __typename?: "ReviewRequestConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "ReviewRequest";
                requestedReviewer?:
                  | { __typename?: "Mannequin" }
                  | { __typename?: "Team" }
                  | { __typename?: "User"; isViewer: boolean }
                  | null;
              } | null> | null;
            } | null;
            comments: {
              __typename?: "IssueCommentConnection";
              totalCount: number;
            };
            reviewThreads: {
              __typename?: "PullRequestReviewThreadConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestReviewThread";
                comments: {
                  __typename?: "PullRequestReviewCommentConnection";
                  totalCount: number;
                };
              } | null> | null;
            };
            reviews?: {
              __typename?: "PullRequestReviewConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestReview";
                bodyText: string;
              } | null> | null;
            } | null;
          }
        | { __typename: "Repository" }
        | { __typename: "User" }
        | null;
    } | null> | null;
  };
  mentionedOpen: {
    __typename?: "SearchResultItemConnection";
    pullRequests?: Array<{
      __typename?: "SearchResultItemEdge";
      pullRequest?:
        | { __typename: "App" }
        | { __typename: "Discussion" }
        | { __typename: "Issue" }
        | { __typename: "MarketplaceListing" }
        | { __typename: "Organization" }
        | {
            __typename: "PullRequest";
            permalink: string;
            title: string;
            number: number;
            isDraft: boolean;
            reviewDecision?: Types.PullRequestReviewDecision | null;
            nodeId: string;
            isMerged: boolean;
            isClosed: boolean;
            mergingState: Types.MergeableState;
            date: string;
            createdDate: string;
            updatedDate: string;
            fromBranch?: {
              __typename?: "Ref";
              name: string;
              nodeId: string;
              commit?:
                | { __typename?: "Blob" }
                | {
                    __typename?: "Commit";
                    message: string;
                    date: string;
                    sha: any;
                  }
                | { __typename?: "Tag" }
                | { __typename?: "Tree" }
                | null;
            } | null;
            author?:
              | {
                  __typename?: "Bot";
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "EnterpriseUserAccount";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "Mannequin";
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "Organization";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "User";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | null;
            milestone?: {
              __typename?: "Milestone";
              title: string;
              number: number;
              nodeId: string;
            } | null;
            repository: {
              __typename?: "Repository";
              name: string;
              url: string;
              hasIssuesEnabled: boolean;
              isArchived: boolean;
              isDisabled: boolean;
              isLocked: boolean;
              mergeCommitAllowed: boolean;
              squashMergeAllowed: boolean;
              rebaseMergeAllowed: boolean;
              deleteBranchOnMerge: boolean;
              id?: number | null;
              nodeId: string;
              date: string;
              isStarred: boolean;
              numberOfStars: number;
              owner:
                | {
                    __typename?: "Organization";
                    githubUsername: string;
                    avatarURL: string;
                  }
                | {
                    __typename?: "User";
                    githubUsername: string;
                    avatarURL: string;
                  };
              primaryLanguage?: {
                __typename?: "Language";
                name: string;
                color?: string | null;
                nodeId: string;
              } | null;
            };
            commits: {
              __typename?: "PullRequestCommitConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestCommit";
                commit: {
                  __typename?: "Commit";
                  message: string;
                  nodeId: string;
                  hash: any;
                  statusCheckRollup?: {
                    __typename?: "StatusCheckRollup";
                    state: Types.StatusState;
                  } | null;
                };
              } | null> | null;
            };
            reviewRequests?: {
              __typename?: "ReviewRequestConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "ReviewRequest";
                requestedReviewer?:
                  | { __typename?: "Mannequin" }
                  | { __typename?: "Team" }
                  | { __typename?: "User"; isViewer: boolean }
                  | null;
              } | null> | null;
            } | null;
            comments: {
              __typename?: "IssueCommentConnection";
              totalCount: number;
            };
            reviewThreads: {
              __typename?: "PullRequestReviewThreadConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestReviewThread";
                comments: {
                  __typename?: "PullRequestReviewCommentConnection";
                  totalCount: number;
                };
              } | null> | null;
            };
            reviews?: {
              __typename?: "PullRequestReviewConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestReview";
                bodyText: string;
              } | null> | null;
            } | null;
          }
        | { __typename: "Repository" }
        | { __typename: "User" }
        | null;
    } | null> | null;
  };
  mentionedClosed: {
    __typename?: "SearchResultItemConnection";
    pullRequests?: Array<{
      __typename?: "SearchResultItemEdge";
      pullRequest?:
        | { __typename: "App" }
        | { __typename: "Discussion" }
        | { __typename: "Issue" }
        | { __typename: "MarketplaceListing" }
        | { __typename: "Organization" }
        | {
            __typename: "PullRequest";
            permalink: string;
            title: string;
            number: number;
            isDraft: boolean;
            reviewDecision?: Types.PullRequestReviewDecision | null;
            nodeId: string;
            isMerged: boolean;
            isClosed: boolean;
            mergingState: Types.MergeableState;
            date: string;
            createdDate: string;
            updatedDate: string;
            fromBranch?: {
              __typename?: "Ref";
              name: string;
              nodeId: string;
              commit?:
                | { __typename?: "Blob" }
                | {
                    __typename?: "Commit";
                    message: string;
                    date: string;
                    sha: any;
                  }
                | { __typename?: "Tag" }
                | { __typename?: "Tree" }
                | null;
            } | null;
            author?:
              | {
                  __typename?: "Bot";
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "EnterpriseUserAccount";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "Mannequin";
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "Organization";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "User";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | null;
            milestone?: {
              __typename?: "Milestone";
              title: string;
              number: number;
              nodeId: string;
            } | null;
            repository: {
              __typename?: "Repository";
              name: string;
              url: string;
              hasIssuesEnabled: boolean;
              isArchived: boolean;
              isDisabled: boolean;
              isLocked: boolean;
              mergeCommitAllowed: boolean;
              squashMergeAllowed: boolean;
              rebaseMergeAllowed: boolean;
              deleteBranchOnMerge: boolean;
              id?: number | null;
              nodeId: string;
              date: string;
              isStarred: boolean;
              numberOfStars: number;
              owner:
                | {
                    __typename?: "Organization";
                    githubUsername: string;
                    avatarURL: string;
                  }
                | {
                    __typename?: "User";
                    githubUsername: string;
                    avatarURL: string;
                  };
              primaryLanguage?: {
                __typename?: "Language";
                name: string;
                color?: string | null;
                nodeId: string;
              } | null;
            };
            commits: {
              __typename?: "PullRequestCommitConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestCommit";
                commit: {
                  __typename?: "Commit";
                  message: string;
                  nodeId: string;
                  hash: any;
                  statusCheckRollup?: {
                    __typename?: "StatusCheckRollup";
                    state: Types.StatusState;
                  } | null;
                };
              } | null> | null;
            };
            reviewRequests?: {
              __typename?: "ReviewRequestConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "ReviewRequest";
                requestedReviewer?:
                  | { __typename?: "Mannequin" }
                  | { __typename?: "Team" }
                  | { __typename?: "User"; isViewer: boolean }
                  | null;
              } | null> | null;
            } | null;
            comments: {
              __typename?: "IssueCommentConnection";
              totalCount: number;
            };
            reviewThreads: {
              __typename?: "PullRequestReviewThreadConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestReviewThread";
                comments: {
                  __typename?: "PullRequestReviewCommentConnection";
                  totalCount: number;
                };
              } | null> | null;
            };
            reviews?: {
              __typename?: "PullRequestReviewConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestReview";
                bodyText: string;
              } | null> | null;
            } | null;
          }
        | { __typename: "Repository" }
        | { __typename: "User" }
        | null;
    } | null> | null;
  };
  reviewRequestsOpen: {
    __typename?: "SearchResultItemConnection";
    pullRequests?: Array<{
      __typename?: "SearchResultItemEdge";
      pullRequest?:
        | { __typename: "App" }
        | { __typename: "Discussion" }
        | { __typename: "Issue" }
        | { __typename: "MarketplaceListing" }
        | { __typename: "Organization" }
        | {
            __typename: "PullRequest";
            permalink: string;
            title: string;
            number: number;
            isDraft: boolean;
            reviewDecision?: Types.PullRequestReviewDecision | null;
            nodeId: string;
            isMerged: boolean;
            isClosed: boolean;
            mergingState: Types.MergeableState;
            date: string;
            createdDate: string;
            updatedDate: string;
            fromBranch?: {
              __typename?: "Ref";
              name: string;
              nodeId: string;
              commit?:
                | { __typename?: "Blob" }
                | {
                    __typename?: "Commit";
                    message: string;
                    date: string;
                    sha: any;
                  }
                | { __typename?: "Tag" }
                | { __typename?: "Tree" }
                | null;
            } | null;
            author?:
              | {
                  __typename?: "Bot";
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "EnterpriseUserAccount";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "Mannequin";
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "Organization";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "User";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | null;
            milestone?: {
              __typename?: "Milestone";
              title: string;
              number: number;
              nodeId: string;
            } | null;
            repository: {
              __typename?: "Repository";
              name: string;
              url: string;
              hasIssuesEnabled: boolean;
              isArchived: boolean;
              isDisabled: boolean;
              isLocked: boolean;
              mergeCommitAllowed: boolean;
              squashMergeAllowed: boolean;
              rebaseMergeAllowed: boolean;
              deleteBranchOnMerge: boolean;
              id?: number | null;
              nodeId: string;
              date: string;
              isStarred: boolean;
              numberOfStars: number;
              owner:
                | {
                    __typename?: "Organization";
                    githubUsername: string;
                    avatarURL: string;
                  }
                | {
                    __typename?: "User";
                    githubUsername: string;
                    avatarURL: string;
                  };
              primaryLanguage?: {
                __typename?: "Language";
                name: string;
                color?: string | null;
                nodeId: string;
              } | null;
            };
            commits: {
              __typename?: "PullRequestCommitConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestCommit";
                commit: {
                  __typename?: "Commit";
                  message: string;
                  nodeId: string;
                  hash: any;
                  statusCheckRollup?: {
                    __typename?: "StatusCheckRollup";
                    state: Types.StatusState;
                  } | null;
                };
              } | null> | null;
            };
            reviewRequests?: {
              __typename?: "ReviewRequestConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "ReviewRequest";
                requestedReviewer?:
                  | { __typename?: "Mannequin" }
                  | { __typename?: "Team" }
                  | { __typename?: "User"; isViewer: boolean }
                  | null;
              } | null> | null;
            } | null;
            comments: {
              __typename?: "IssueCommentConnection";
              totalCount: number;
            };
            reviewThreads: {
              __typename?: "PullRequestReviewThreadConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestReviewThread";
                comments: {
                  __typename?: "PullRequestReviewCommentConnection";
                  totalCount: number;
                };
              } | null> | null;
            };
            reviews?: {
              __typename?: "PullRequestReviewConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestReview";
                bodyText: string;
              } | null> | null;
            } | null;
          }
        | { __typename: "Repository" }
        | { __typename: "User" }
        | null;
    } | null> | null;
  };
  reviewRequestsClosed: {
    __typename?: "SearchResultItemConnection";
    pullRequests?: Array<{
      __typename?: "SearchResultItemEdge";
      pullRequest?:
        | { __typename: "App" }
        | { __typename: "Discussion" }
        | { __typename: "Issue" }
        | { __typename: "MarketplaceListing" }
        | { __typename: "Organization" }
        | {
            __typename: "PullRequest";
            permalink: string;
            title: string;
            number: number;
            isDraft: boolean;
            reviewDecision?: Types.PullRequestReviewDecision | null;
            nodeId: string;
            isMerged: boolean;
            isClosed: boolean;
            mergingState: Types.MergeableState;
            date: string;
            createdDate: string;
            updatedDate: string;
            fromBranch?: {
              __typename?: "Ref";
              name: string;
              nodeId: string;
              commit?:
                | { __typename?: "Blob" }
                | {
                    __typename?: "Commit";
                    message: string;
                    date: string;
                    sha: any;
                  }
                | { __typename?: "Tag" }
                | { __typename?: "Tree" }
                | null;
            } | null;
            author?:
              | {
                  __typename?: "Bot";
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "EnterpriseUserAccount";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "Mannequin";
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "Organization";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "User";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | null;
            milestone?: {
              __typename?: "Milestone";
              title: string;
              number: number;
              nodeId: string;
            } | null;
            repository: {
              __typename?: "Repository";
              name: string;
              url: string;
              hasIssuesEnabled: boolean;
              isArchived: boolean;
              isDisabled: boolean;
              isLocked: boolean;
              mergeCommitAllowed: boolean;
              squashMergeAllowed: boolean;
              rebaseMergeAllowed: boolean;
              deleteBranchOnMerge: boolean;
              id?: number | null;
              nodeId: string;
              date: string;
              isStarred: boolean;
              numberOfStars: number;
              owner:
                | {
                    __typename?: "Organization";
                    githubUsername: string;
                    avatarURL: string;
                  }
                | {
                    __typename?: "User";
                    githubUsername: string;
                    avatarURL: string;
                  };
              primaryLanguage?: {
                __typename?: "Language";
                name: string;
                color?: string | null;
                nodeId: string;
              } | null;
            };
            commits: {
              __typename?: "PullRequestCommitConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestCommit";
                commit: {
                  __typename?: "Commit";
                  message: string;
                  nodeId: string;
                  hash: any;
                  statusCheckRollup?: {
                    __typename?: "StatusCheckRollup";
                    state: Types.StatusState;
                  } | null;
                };
              } | null> | null;
            };
            reviewRequests?: {
              __typename?: "ReviewRequestConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "ReviewRequest";
                requestedReviewer?:
                  | { __typename?: "Mannequin" }
                  | { __typename?: "Team" }
                  | { __typename?: "User"; isViewer: boolean }
                  | null;
              } | null> | null;
            } | null;
            comments: {
              __typename?: "IssueCommentConnection";
              totalCount: number;
            };
            reviewThreads: {
              __typename?: "PullRequestReviewThreadConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestReviewThread";
                comments: {
                  __typename?: "PullRequestReviewCommentConnection";
                  totalCount: number;
                };
              } | null> | null;
            };
            reviews?: {
              __typename?: "PullRequestReviewConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestReview";
                bodyText: string;
              } | null> | null;
            } | null;
          }
        | { __typename: "Repository" }
        | { __typename: "User" }
        | null;
    } | null> | null;
  };
  reviewedByOpen: {
    __typename?: "SearchResultItemConnection";
    pullRequests?: Array<{
      __typename?: "SearchResultItemEdge";
      pullRequest?:
        | { __typename: "App" }
        | { __typename: "Discussion" }
        | { __typename: "Issue" }
        | { __typename: "MarketplaceListing" }
        | { __typename: "Organization" }
        | {
            __typename: "PullRequest";
            permalink: string;
            title: string;
            number: number;
            isDraft: boolean;
            reviewDecision?: Types.PullRequestReviewDecision | null;
            nodeId: string;
            isMerged: boolean;
            isClosed: boolean;
            mergingState: Types.MergeableState;
            date: string;
            createdDate: string;
            updatedDate: string;
            fromBranch?: {
              __typename?: "Ref";
              name: string;
              nodeId: string;
              commit?:
                | { __typename?: "Blob" }
                | {
                    __typename?: "Commit";
                    message: string;
                    date: string;
                    sha: any;
                  }
                | { __typename?: "Tag" }
                | { __typename?: "Tree" }
                | null;
            } | null;
            author?:
              | {
                  __typename?: "Bot";
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "EnterpriseUserAccount";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "Mannequin";
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "Organization";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "User";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | null;
            milestone?: {
              __typename?: "Milestone";
              title: string;
              number: number;
              nodeId: string;
            } | null;
            repository: {
              __typename?: "Repository";
              name: string;
              url: string;
              hasIssuesEnabled: boolean;
              isArchived: boolean;
              isDisabled: boolean;
              isLocked: boolean;
              mergeCommitAllowed: boolean;
              squashMergeAllowed: boolean;
              rebaseMergeAllowed: boolean;
              deleteBranchOnMerge: boolean;
              id?: number | null;
              nodeId: string;
              date: string;
              isStarred: boolean;
              numberOfStars: number;
              owner:
                | {
                    __typename?: "Organization";
                    githubUsername: string;
                    avatarURL: string;
                  }
                | {
                    __typename?: "User";
                    githubUsername: string;
                    avatarURL: string;
                  };
              primaryLanguage?: {
                __typename?: "Language";
                name: string;
                color?: string | null;
                nodeId: string;
              } | null;
            };
            commits: {
              __typename?: "PullRequestCommitConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestCommit";
                commit: {
                  __typename?: "Commit";
                  message: string;
                  nodeId: string;
                  hash: any;
                  statusCheckRollup?: {
                    __typename?: "StatusCheckRollup";
                    state: Types.StatusState;
                  } | null;
                };
              } | null> | null;
            };
            reviewRequests?: {
              __typename?: "ReviewRequestConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "ReviewRequest";
                requestedReviewer?:
                  | { __typename?: "Mannequin" }
                  | { __typename?: "Team" }
                  | { __typename?: "User"; isViewer: boolean }
                  | null;
              } | null> | null;
            } | null;
            comments: {
              __typename?: "IssueCommentConnection";
              totalCount: number;
            };
            reviewThreads: {
              __typename?: "PullRequestReviewThreadConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestReviewThread";
                comments: {
                  __typename?: "PullRequestReviewCommentConnection";
                  totalCount: number;
                };
              } | null> | null;
            };
            reviews?: {
              __typename?: "PullRequestReviewConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestReview";
                bodyText: string;
              } | null> | null;
            } | null;
          }
        | { __typename: "Repository" }
        | { __typename: "User" }
        | null;
    } | null> | null;
  };
  reviewedByClosed: {
    __typename?: "SearchResultItemConnection";
    pullRequests?: Array<{
      __typename?: "SearchResultItemEdge";
      pullRequest?:
        | { __typename: "App" }
        | { __typename: "Discussion" }
        | { __typename: "Issue" }
        | { __typename: "MarketplaceListing" }
        | { __typename: "Organization" }
        | {
            __typename: "PullRequest";
            permalink: string;
            title: string;
            number: number;
            isDraft: boolean;
            reviewDecision?: Types.PullRequestReviewDecision | null;
            nodeId: string;
            isMerged: boolean;
            isClosed: boolean;
            mergingState: Types.MergeableState;
            date: string;
            createdDate: string;
            updatedDate: string;
            fromBranch?: {
              __typename?: "Ref";
              name: string;
              nodeId: string;
              commit?:
                | { __typename?: "Blob" }
                | {
                    __typename?: "Commit";
                    message: string;
                    date: string;
                    sha: any;
                  }
                | { __typename?: "Tag" }
                | { __typename?: "Tree" }
                | null;
            } | null;
            author?:
              | {
                  __typename?: "Bot";
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "EnterpriseUserAccount";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "Mannequin";
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "Organization";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | {
                  __typename?: "User";
                  name?: string | null;
                  nodeId: string;
                  githubUsername: string;
                  avatarURL: string;
                }
              | null;
            milestone?: {
              __typename?: "Milestone";
              title: string;
              number: number;
              nodeId: string;
            } | null;
            repository: {
              __typename?: "Repository";
              name: string;
              url: string;
              hasIssuesEnabled: boolean;
              isArchived: boolean;
              isDisabled: boolean;
              isLocked: boolean;
              mergeCommitAllowed: boolean;
              squashMergeAllowed: boolean;
              rebaseMergeAllowed: boolean;
              deleteBranchOnMerge: boolean;
              id?: number | null;
              nodeId: string;
              date: string;
              isStarred: boolean;
              numberOfStars: number;
              owner:
                | {
                    __typename?: "Organization";
                    githubUsername: string;
                    avatarURL: string;
                  }
                | {
                    __typename?: "User";
                    githubUsername: string;
                    avatarURL: string;
                  };
              primaryLanguage?: {
                __typename?: "Language";
                name: string;
                color?: string | null;
                nodeId: string;
              } | null;
            };
            commits: {
              __typename?: "PullRequestCommitConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestCommit";
                commit: {
                  __typename?: "Commit";
                  message: string;
                  nodeId: string;
                  hash: any;
                  statusCheckRollup?: {
                    __typename?: "StatusCheckRollup";
                    state: Types.StatusState;
                  } | null;
                };
              } | null> | null;
            };
            reviewRequests?: {
              __typename?: "ReviewRequestConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "ReviewRequest";
                requestedReviewer?:
                  | { __typename?: "Mannequin" }
                  | { __typename?: "Team" }
                  | { __typename?: "User"; isViewer: boolean }
                  | null;
              } | null> | null;
            } | null;
            comments: {
              __typename?: "IssueCommentConnection";
              totalCount: number;
            };
            reviewThreads: {
              __typename?: "PullRequestReviewThreadConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestReviewThread";
                comments: {
                  __typename?: "PullRequestReviewCommentConnection";
                  totalCount: number;
                };
              } | null> | null;
            };
            reviews?: {
              __typename?: "PullRequestReviewConnection";
              totalCount: number;
              nodes?: Array<{
                __typename?: "PullRequestReview";
                bodyText: string;
              } | null> | null;
            } | null;
          }
        | { __typename: "Repository" }
        | { __typename: "User" }
        | null;
    } | null> | null;
  };
};

export const PullRequestFieldsFragmentDoc = gql`
  fragment PullRequestFields on PullRequest {
    nodeId: id
    permalink
    title
    isMerged: merged
    number
    isDraft
    isClosed: closed
    fromBranch: headRef {
      nodeId: id
      name
      commit: target {
        ... on Commit {
          date: authoredDate
          sha: oid
          message
        }
      }
    }
    mergingState: mergeable
    reviewDecision
    date: updatedAt
    createdDate: createdAt
    updatedDate: updatedAt
    author {
      ... on Bot {
        nodeId: id
        githubUsername: login
        avatarURL: avatarUrl(size: $avatarSize)
      }
      ... on User {
        nodeId: id
        githubUsername: login
        name
        avatarURL: avatarUrl(size: $avatarSize)
      }
      ... on Mannequin {
        nodeId: id
        githubUsername: login
        avatarURL: avatarUrl(size: $avatarSize)
      }
      ... on Organization {
        nodeId: id
        githubUsername: login
        name
        avatarURL: avatarUrl(size: $avatarSize)
      }
      ... on EnterpriseUserAccount {
        nodeId: id
        githubUsername: login
        name
        avatarURL: avatarUrl(size: $avatarSize)
      }
    }
    milestone {
      ... on Milestone {
        nodeId: id
        title
        number
      }
    }
    repository {
      ... on Repository {
        id: databaseId
        nodeId: id
        owner {
          githubUsername: login
          avatarURL: avatarUrl(size: $avatarSize)
        }
        name
        url
        hasIssuesEnabled
        isArchived
        isDisabled
        isLocked
        mergeCommitAllowed
        squashMergeAllowed
        rebaseMergeAllowed
        deleteBranchOnMerge
        date: updatedAt
        isStarred: viewerHasStarred
        numberOfStars: stargazerCount
        primaryLanguage {
          nodeId: id
          name
          color
        }
      }
    }
    commits(last: 1) {
      totalCount
      nodes {
        commit {
          nodeId: id
          hash: oid
          message
          statusCheckRollup {
            state
          }
        }
      }
    }
    reviewRequests(first: 50) {
      totalCount
      nodes {
        requestedReviewer {
          ... on User {
            isViewer
          }
        }
      }
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
  }
`;
export const SearchPullRequestsDocument = gql`
  query SearchPullRequests(
    $createdOpenQuery: String!
    $createdClosedQuery: String!
    $assignedOpenQuery: String!
    $assignedClosedQuery: String!
    $mentionedOpenQuery: String!
    $mentionedClosedQuery: String!
    $reviewRequestsOpenQuery: String!
    $reviewRequestsClosedQuery: String!
    $reviewedByOpenQuery: String!
    $reviewedByClosedQuery: String!
    $numberOfOpenItems: Int!
    $numberOfClosedItems: Int!
    $avatarSize: Int!
  ) {
    createdOpen: search(
      query: $createdOpenQuery
      type: ISSUE
      first: $numberOfOpenItems
    ) {
      pullRequests: edges {
        pullRequest: node {
          __typename
          ...PullRequestFields
        }
      }
    }
    createdClosed: search(
      query: $createdClosedQuery
      type: ISSUE
      first: $numberOfClosedItems
    ) {
      pullRequests: edges {
        pullRequest: node {
          __typename
          ...PullRequestFields
        }
      }
    }
    assignedOpen: search(
      query: $assignedOpenQuery
      type: ISSUE
      first: $numberOfOpenItems
    ) {
      pullRequests: edges {
        pullRequest: node {
          __typename
          ...PullRequestFields
        }
      }
    }
    assignedClosed: search(
      query: $assignedClosedQuery
      type: ISSUE
      first: $numberOfClosedItems
    ) {
      pullRequests: edges {
        pullRequest: node {
          __typename
          ...PullRequestFields
        }
      }
    }
    mentionedOpen: search(
      query: $mentionedOpenQuery
      type: ISSUE
      first: $numberOfOpenItems
    ) {
      pullRequests: edges {
        pullRequest: node {
          __typename
          ...PullRequestFields
        }
      }
    }
    mentionedClosed: search(
      query: $mentionedClosedQuery
      type: ISSUE
      first: $numberOfClosedItems
    ) {
      pullRequests: edges {
        pullRequest: node {
          __typename
          ...PullRequestFields
        }
      }
    }
    reviewRequestsOpen: search(
      query: $reviewRequestsOpenQuery
      type: ISSUE
      first: $numberOfOpenItems
    ) {
      pullRequests: edges {
        pullRequest: node {
          __typename
          ...PullRequestFields
        }
      }
    }
    reviewRequestsClosed: search(
      query: $reviewRequestsClosedQuery
      type: ISSUE
      first: $numberOfClosedItems
    ) {
      pullRequests: edges {
        pullRequest: node {
          __typename
          ...PullRequestFields
        }
      }
    }
    reviewedByOpen: search(
      query: $reviewedByOpenQuery
      type: ISSUE
      first: $numberOfOpenItems
    ) {
      pullRequests: edges {
        pullRequest: node {
          __typename
          ...PullRequestFields
        }
      }
    }
    reviewedByClosed: search(
      query: $reviewedByClosedQuery
      type: ISSUE
      first: $numberOfOpenItems
    ) {
      pullRequests: edges {
        pullRequest: node {
          __typename
          ...PullRequestFields
        }
      }
    }
  }
  ${PullRequestFieldsFragmentDoc}
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (
  action,
  _operationName,
  _operationType
) => action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper
) {
  return {
    SearchPullRequests(
      variables: SearchPullRequestsQueryVariables,
      requestHeaders?: Dom.RequestInit["headers"]
    ): Promise<SearchPullRequestsQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<SearchPullRequestsQuery>(
            SearchPullRequestsDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        "SearchPullRequests",
        "query"
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
