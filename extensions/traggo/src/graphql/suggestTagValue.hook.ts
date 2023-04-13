/* eslint-disable */
import * as Types from "./types";

import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
const defaultOptions = {} as const;
export type SuggestTagValueQueryVariables = Types.Exact<{
  key: Types.Scalars["String"];
  query: Types.Scalars["String"];
}>;

export type SuggestTagValueQuery = { __typename?: "RootQuery"; suggestTagValue?: Array<string> | null };

export const SuggestTagValueDocument = gql`
  query SuggestTagValue($key: String!, $query: String!) {
    suggestTagValue(key: $key, query: $query)
  }
`;

/**
 * __useSuggestTagValueQuery__
 *
 * To run a query within a React component, call `useSuggestTagValueQuery` and pass it any options that fit your needs.
 * When your component renders, `useSuggestTagValueQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSuggestTagValueQuery({
 *   variables: {
 *      key: // value for 'key'
 *      query: // value for 'query'
 *   },
 * });
 */
export function useSuggestTagValueQuery(
  baseOptions: Apollo.QueryHookOptions<SuggestTagValueQuery, SuggestTagValueQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<SuggestTagValueQuery, SuggestTagValueQueryVariables>(SuggestTagValueDocument, options);
}
export function useSuggestTagValueLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<SuggestTagValueQuery, SuggestTagValueQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<SuggestTagValueQuery, SuggestTagValueQueryVariables>(SuggestTagValueDocument, options);
}
export type SuggestTagValueQueryHookResult = ReturnType<typeof useSuggestTagValueQuery>;
export type SuggestTagValueLazyQueryHookResult = ReturnType<typeof useSuggestTagValueLazyQuery>;
export type SuggestTagValueQueryResult = Apollo.QueryResult<SuggestTagValueQuery, SuggestTagValueQueryVariables>;
