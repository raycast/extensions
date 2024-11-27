import * as Types from "../schema.generated";

import { GraphQLClient } from "graphql-request";
import * as Dom from "graphql-request/dist/types.dom";
import gql from "graphql-tag";
export type SearchReviewRequestQueryVariables = Types.Exact<{
  query: Types.Scalars["String"]["input"];
}>;

export type SearchReviewRequestQuery = {
  __typename?: "Query";
  search: {
    __typename?: "SearchResultItemConnection";
    edges?: Array<{
      __typename?: "SearchResultItemEdge";
      node?:
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
            repository: { __typename?: "Repository"; nameWithOwner: string };
            author?:
              | { __typename?: "Bot"; avatarUrl: string }
              | { __typename?: "EnterpriseUserAccount"; avatarUrl: string }
              | { __typename?: "Mannequin"; avatarUrl: string }
              | { __typename?: "Organization"; avatarUrl: string }
              | { __typename?: "User"; avatarUrl: string }
              | null;
            commits: {
              __typename?: "PullRequestCommitConnection";
              edges?: Array<{
                __typename?: "PullRequestCommitEdge";
                node?: {
                  __typename?: "PullRequestCommit";
                  commit: {
                    __typename?: "Commit";
                    statusCheckRollup?: { __typename?: "StatusCheckRollup"; state: Types.StatusState } | null;
                  };
                } | null;
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
  operationType?: string
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    SearchReviewRequest(
      variables: SearchReviewRequestQueryVariables,
      requestHeaders?: Dom.RequestInit["headers"]
    ): Promise<SearchReviewRequestQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SearchReviewRequestQuery>(SearchReviewRequestDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        "SearchReviewRequest",
        "query"
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
