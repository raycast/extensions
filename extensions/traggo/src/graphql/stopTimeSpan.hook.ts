/* eslint-disable */
import * as Types from "./types";

import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
const defaultOptions = {} as const;
export type StopTimeSpanMutationVariables = Types.Exact<{
  id: Types.Scalars["Int"];
  end: Types.Scalars["Time"];
}>;

export type StopTimeSpanMutation = {
  __typename?: "RootMutation";
  stopTimeSpan?: { __typename?: "TimeSpan"; id: number } | null;
};

export const StopTimeSpanDocument = gql`
  mutation StopTimeSpan($id: Int!, $end: Time!) {
    stopTimeSpan(id: $id, end: $end) {
      id
    }
  }
`;
export type StopTimeSpanMutationFn = Apollo.MutationFunction<StopTimeSpanMutation, StopTimeSpanMutationVariables>;

/**
 * __useStopTimeSpanMutation__
 *
 * To run a mutation, you first call `useStopTimeSpanMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useStopTimeSpanMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [stopTimeSpanMutation, { data, loading, error }] = useStopTimeSpanMutation({
 *   variables: {
 *      id: // value for 'id'
 *      end: // value for 'end'
 *   },
 * });
 */
export function useStopTimeSpanMutation(
  baseOptions?: Apollo.MutationHookOptions<StopTimeSpanMutation, StopTimeSpanMutationVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<StopTimeSpanMutation, StopTimeSpanMutationVariables>(StopTimeSpanDocument, options);
}
export type StopTimeSpanMutationHookResult = ReturnType<typeof useStopTimeSpanMutation>;
export type StopTimeSpanMutationResult = Apollo.MutationResult<StopTimeSpanMutation>;
export type StopTimeSpanMutationOptions = Apollo.BaseMutationOptions<
  StopTimeSpanMutation,
  StopTimeSpanMutationVariables
>;
