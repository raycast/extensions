/* eslint-disable */
import * as Types from "./types";

import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
const defaultOptions = {} as const;
export type TimersQueryVariables = Types.Exact<{ [key: string]: never }>;

export type TimersQuery = {
  __typename?: "RootQuery";
  timers?: Array<{
    __typename?: "TimeSpan";
    id: number;
    start: string;
    note: string;
    tags?: Array<{ __typename?: "TimeSpanTag"; key: string; value: string }> | null;
  }> | null;
};

export const TimersDocument = gql`
  query Timers {
    timers {
      id
      start
      tags {
        key
        value
      }
      note
    }
  }
`;

/**
 * __useTimersQuery__
 *
 * To run a query within a React component, call `useTimersQuery` and pass it any options that fit your needs.
 * When your component renders, `useTimersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTimersQuery({
 *   variables: {
 *   },
 * });
 */
export function useTimersQuery(baseOptions?: Apollo.QueryHookOptions<TimersQuery, TimersQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<TimersQuery, TimersQueryVariables>(TimersDocument, options);
}
export function useTimersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TimersQuery, TimersQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<TimersQuery, TimersQueryVariables>(TimersDocument, options);
}
export type TimersQueryHookResult = ReturnType<typeof useTimersQuery>;
export type TimersLazyQueryHookResult = ReturnType<typeof useTimersLazyQuery>;
export type TimersQueryResult = Apollo.QueryResult<TimersQuery, TimersQueryVariables>;
