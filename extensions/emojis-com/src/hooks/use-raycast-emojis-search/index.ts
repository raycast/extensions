import { useInfiniteQuery } from "@tanstack/react-query";

import type {
  GetRaycastEmojisSearchQuery,
  GetRaycastEmojisSearchQueryVariables,
} from "@/hooks/use-raycast-emojis-search/graphql/get-raycast-emojis-search.generated";
import { getRaycastEmojisSearchInfiniteQueryOptions } from "@/hooks/use-raycast-emojis-search/utils";
import { graphqlClient } from "@/utils/graphql/ssr";

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
