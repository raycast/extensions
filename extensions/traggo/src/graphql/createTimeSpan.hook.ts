/* eslint-disable */
import * as Types from "./types";

import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
const defaultOptions = {} as const;
export type CreateTimeSpanMutationVariables = Types.Exact<{
  start: Types.Scalars["Time"];
  tags?: Types.InputMaybe<Array<Types.InputTimeSpanTag> | Types.InputTimeSpanTag>;
  note: Types.Scalars["String"];
}>;

export type CreateTimeSpanMutation = {
  __typename?: "RootMutation";
  createTimeSpan?: { __typename?: "TimeSpan"; id: number } | null;
};

export const CreateTimeSpanDocument = gql`
  mutation CreateTimeSpan($start: Time!, $tags: [InputTimeSpanTag!], $note: String!) {
    createTimeSpan(start: $start, tags: $tags, note: $note) {
      id
    }
  }
`;
export type CreateTimeSpanMutationFn = Apollo.MutationFunction<CreateTimeSpanMutation, CreateTimeSpanMutationVariables>;

/**
 * __useCreateTimeSpanMutation__
 *
 * To run a mutation, you first call `useCreateTimeSpanMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateTimeSpanMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createTimeSpanMutation, { data, loading, error }] = useCreateTimeSpanMutation({
 *   variables: {
 *      start: // value for 'start'
 *      tags: // value for 'tags'
 *      note: // value for 'note'
 *   },
 * });
 */
export function useCreateTimeSpanMutation(
  baseOptions?: Apollo.MutationHookOptions<CreateTimeSpanMutation, CreateTimeSpanMutationVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<CreateTimeSpanMutation, CreateTimeSpanMutationVariables>(CreateTimeSpanDocument, options);
}
export type CreateTimeSpanMutationHookResult = ReturnType<typeof useCreateTimeSpanMutation>;
export type CreateTimeSpanMutationResult = Apollo.MutationResult<CreateTimeSpanMutation>;
export type CreateTimeSpanMutationOptions = Apollo.BaseMutationOptions<
  CreateTimeSpanMutation,
  CreateTimeSpanMutationVariables
>;
