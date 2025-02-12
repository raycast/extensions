import * as Types from "../schema.generated";

import { GraphQLClient } from "graphql-request";
import * as Dom from "graphql-request/dist/types.dom";
import gql from "graphql-tag";
export type SearchPullRequestsWithDependenciesQueryVariables = Types.Exact<{
  query: Types.Scalars["String"]["input"];
}>;

export type SearchPullRequestsWithDependenciesQuery = {
  __typename?: "Query";
  search: {
    __typename?: "SearchResultItemConnection";
    nodes?: Array<
      | { __typename: "App" }
      | { __typename: "Discussion" }
      | { __typename: "Issue" }
      | { __typename: "MarketplaceListing" }
      | { __typename: "Organization" }
      | {
          __typename: "PullRequest";
          id: string;
          number: number;
          title: string;
          url: string;
          createdAt: string;
          updatedAt: string;
          reviewDecision?: Types.PullRequestReviewDecision | null;
          author?:
            | { __typename?: "Bot"; login: string; avatarUrl: string }
            | { __typename?: "EnterpriseUserAccount"; login: string; avatarUrl: string }
            | { __typename?: "Mannequin"; login: string; avatarUrl: string }
            | { __typename?: "Organization"; login: string; avatarUrl: string }
            | { __typename?: "User"; login: string; avatarUrl: string }
            | null;
          repository: {
            __typename?: "Repository";
            name: string;
            owner:
              | { __typename?: "Organization"; login: string; avatarUrl: string }
              | { __typename?: "User"; login: string; avatarUrl: string };
          };
          reviews?: {
            __typename?: "PullRequestReviewConnection";
            nodes?: Array<{
              __typename?: "PullRequestReview";
              id: string;
              createdAt: string;
              state: Types.PullRequestReviewState;
              url: string;
              submittedAt?: string | null;
              author?:
                | { __typename?: "Bot"; login: string; avatarUrl: string }
                | { __typename?: "EnterpriseUserAccount"; login: string; avatarUrl: string }
                | { __typename?: "Mannequin"; login: string; avatarUrl: string }
                | { __typename?: "Organization"; login: string; avatarUrl: string }
                | { __typename?: "User"; login: string; avatarUrl: string }
                | null;
            } | null> | null;
          } | null;
          comments: {
            __typename?: "IssueCommentConnection";
            nodes?: Array<{
              __typename?: "IssueComment";
              id: string;
              createdAt: string;
              bodyText: string;
              url: string;
              author?:
                | { __typename?: "Bot"; login: string; avatarUrl: string }
                | { __typename?: "EnterpriseUserAccount"; login: string; avatarUrl: string }
                | { __typename?: "Mannequin"; login: string; avatarUrl: string }
                | { __typename?: "Organization"; login: string; avatarUrl: string }
                | { __typename?: "User"; login: string; avatarUrl: string }
                | null;
            } | null> | null;
          };
          reviewRequests?: {
            __typename?: "ReviewRequestConnection";
            nodes?: Array<{
              __typename?: "ReviewRequest";
              requestedReviewer?:
                | { __typename: "Bot" }
                | { __typename: "Mannequin" }
                | { __typename: "Team"; id: string; name: string }
                | { __typename: "User"; id: string; login: string; avatarUrl: string }
                | null;
            } | null> | null;
          } | null;
        }
      | { __typename: "Repository" }
      | { __typename: "User" }
      | null
    > | null;
  };
};

export const SearchPullRequestsWithDependenciesDocument = gql`
  query SearchPullRequestsWithDependencies($query: String!) {
    search(type: ISSUE, first: 50, query: $query) {
      nodes {
        __typename
        ... on PullRequest {
          id
          number
          title
          url
          createdAt
          updatedAt
          reviewDecision
          author {
            login
            avatarUrl
          }
          repository {
            name
            owner {
              login
              avatarUrl
            }
          }
          reviews(last: 1) {
            nodes {
              id
              createdAt
              state
              url
              submittedAt
              author {
                login
                avatarUrl
              }
            }
          }
          comments(last: 1) {
            nodes {
              id
              createdAt
              bodyText
              url
              author {
                login
                avatarUrl
              }
            }
          }
          reviewRequests(last: 1) {
            nodes {
              requestedReviewer {
                __typename
                ... on User {
                  id
                  login
                  avatarUrl
                }
                ... on Team {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    SearchPullRequestsWithDependencies(
      variables: SearchPullRequestsWithDependenciesQueryVariables,
      requestHeaders?: Dom.RequestInit["headers"]
    ): Promise<SearchPullRequestsWithDependenciesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SearchPullRequestsWithDependenciesQuery>(
            SearchPullRequestsWithDependenciesDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        "SearchPullRequestsWithDependencies",
        "query"
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
