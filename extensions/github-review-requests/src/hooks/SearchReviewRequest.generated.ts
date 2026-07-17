/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
import * as Types from "../schema.generated";

import { GraphQLClient, type RequestOptions } from "graphql-request";
import gql from "graphql-tag";
type GraphQLClientRequestHeaders = RequestOptions["requestHeaders"];
/** The possible commit status states. */
export type StatusState =
  /** Status is errored. */
  | "ERROR"
  /** Status is expected. */
  | "EXPECTED"
  /** Status is failing. */
  | "FAILURE"
  /** Status is pending. */
  | "PENDING"
  /** Status is successful. */
  | "SUCCESS";

export type SearchReviewRequestQueryVariables = Exact<{
  query: string;
}>;

export type SearchReviewRequestQuery = {
  search: {
    edges: Array<{
      node:
        | { __typename: "App" }
        | { __typename: "Discussion" }
        | { __typename: "Issue" }
        | { __typename: "MarketplaceListing" }
        | { __typename: "Organization" }
        | {
            __typename: "PullRequest";
            title: string;
            url: string;
            updatedAt: string;
            repository: { nameWithOwner: string };
            author:
              | { avatarUrl: string }
              | { avatarUrl: string }
              | { avatarUrl: string }
              | { avatarUrl: string }
              | { avatarUrl: string }
              | null;
            commits: {
              edges: Array<{
                node: { commit: { statusCheckRollup: { state: Types.StatusState } | null } } | null;
              } | null> | null;
            };
          }
        | { __typename: "Repository" }
        | { __typename: "User" }
        | null;
    } | null> | null;
  };
};

export const SearchReviewRequestDocument = gql`
  query SearchReviewRequest($query: String!) {
    search(query: $query, type: ISSUE, first: 30) {
      edges {
        node {
          __typename
          ... on PullRequest {
            title
            url
            updatedAt
            repository {
              nameWithOwner
            }
            author {
              avatarUrl
            }
            commits(last: 1) {
              edges {
                node {
                  commit {
                    statusCheckRollup {
                      state
                    }
                  }
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
    SearchReviewRequest(
      variables: SearchReviewRequestQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit["signal"],
    ): Promise<SearchReviewRequestQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SearchReviewRequestQuery>({
            document: SearchReviewRequestDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        "SearchReviewRequest",
        "query",
        variables,
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
