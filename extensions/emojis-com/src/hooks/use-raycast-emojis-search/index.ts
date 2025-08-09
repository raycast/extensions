import { useInfiniteQuery } from "@tanstack/react-query";
import { graphqlClient } from "../../utils/graphql/ssr";
import {
  GetRaycastEmojisSearchQuery,
  GetRaycastEmojisSearchQueryVariables,
} from "./graphql/get-raycast-emojis-search.generated";
import { getRaycastEmojisSearchInfiniteQueryOptions } from "./utils";

type Emoji = NonNullable<NonNullable<GetRaycastEmojisSearchQuery["searchEmojis"]>["nodes"]>[number];

function useRaycastEmojisSearch(
  {
    variables,
  }: {
    variables: GetRaycastEmojisSearchQueryVariables;
  } = { variables: {} },
) {
  return useInfiniteQuery(getRaycastEmojisSearchInfiniteQueryOptions({ graphqlClient, variables }));
}

export type { Emoji };
export { useRaycastEmojisSearch };
