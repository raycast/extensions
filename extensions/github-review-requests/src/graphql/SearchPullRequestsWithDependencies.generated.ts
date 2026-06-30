/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
import * as Types from "../schema.generated";

import { GraphQLClient, type RequestOptions } from "graphql-request";
import gql from "graphql-tag";
type GraphQLClientRequestHeaders = RequestOptions["requestHeaders"];
/** The review status of a pull request. */
export type PullRequestReviewDecision =
  /** The pull request has received an approving review. */
  | "APPROVED"
  /** Changes have been requested on the pull request. */
  | "CHANGES_REQUESTED"
  /** A review is required before the pull request can be merged. */
  | "REVIEW_REQUIRED";

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

export type SearchPullRequestsWithDependenciesQueryVariables = Exact<{
  query: string;
}>;

export type SearchPullRequestsWithDependenciesQuery = {
  search: {
    nodes: Array<
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
          reviewDecision: Types.PullRequestReviewDecision | null;
          author:
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | { login: string; avatarUrl: string }
            | null;
          repository: {
            name: string;
            owner: { login: string; avatarUrl: string } | { login: string; avatarUrl: string };
          };
          reviews: {
            nodes: Array<{
              id: string;
              createdAt: string;
              state: Types.PullRequestReviewState;
              url: string;
              submittedAt: string | null;
              author:
                | { login: string; avatarUrl: string }
                | { login: string; avatarUrl: string }
                | { login: string; avatarUrl: string }
                | { login: string; avatarUrl: string }
                | { login: string; avatarUrl: string }
                | null;
            } | null> | null;
          } | null;
          comments: {
            nodes: Array<{
              id: string;
              createdAt: string;
              bodyText: string;
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
          reviewRequests: {
            nodes: Array<{
              requestedReviewer:
                | { __typename: "Bot" }
                | { __typename: "EnterpriseTeam" }
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
  operationType?: string,
  variables?: any,
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    SearchPullRequestsWithDependencies(
      variables: SearchPullRequestsWithDependenciesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<SearchPullRequestsWithDependenciesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SearchPullRequestsWithDependenciesQuery>({
            document: SearchPullRequestsWithDependenciesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "SearchPullRequestsWithDependencies",
        "query",
        variables,
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
