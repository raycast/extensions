/* eslint-disable */
import * as Types from "./types";

import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
const defaultOptions = {} as const;
export type MyTestQueryVariables = Types.Exact<{ [key: string]: never }>;

export type MyTestQuery = {
  __typename?: "RootQuery";
  tags?: Array<{ __typename?: "TagDefinition"; color: string; key: string }> | null;
};

export const MyTestDocument = gql`
  query MyTest {
    tags {
      color
      key
    }
  }
`;

/**
 * __useMyTestQuery__
 *
 * To run a query within a React component, call `useMyTestQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyTestQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyTestQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyTestQuery(baseOptions?: Apollo.QueryHookOptions<MyTestQuery, MyTestQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<MyTestQuery, MyTestQueryVariables>(MyTestDocument, options);
}
export function useMyTestLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyTestQuery, MyTestQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<MyTestQuery, MyTestQueryVariables>(MyTestDocument, options);
}
export type MyTestQueryHookResult = ReturnType<typeof useMyTestQuery>;
export type MyTestLazyQueryHookResult = ReturnType<typeof useMyTestLazyQuery>;
export type MyTestQueryResult = Apollo.QueryResult<MyTestQuery, MyTestQueryVariables>;
