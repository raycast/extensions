import type { GraphQLClient } from "graphql-request";
import { infiniteQueryOptions } from "@tanstack/react-query";

import { tagQueryKey } from "@/utils/query";

import type {
  GetRaycastEmojisSearchQuery,
  GetRaycastEmojisSearchQueryVariables,
} from "@/hooks/use-raycast-emojis-search/graphql/get-raycast-emojis-search.generated";
import { GetRaycastEmojisSearchDocument } from "@/hooks/use-raycast-emojis-search/graphql/get-raycast-emojis-search.generated";

function getRaycastEmojisSearchInfiniteQueryOptions({
  graphqlClient,
  variables,
}: {
  graphqlClient: GraphQLClient;
  variables: GetRaycastEmojisSearchQueryVariables;
}) {
  return infiniteQueryOptions({
    queryKey: tagQueryKey<GetRaycastEmojisSearchQuery>(["get-raycast-emojis-search", variables]),
    queryFn: ({ pageParam }) =>
      graphqlClient.request<GetRaycastEmojisSearchQuery, GetRaycastEmojisSearchQueryVariables>(
        GetRaycastEmojisSearchDocument,
        {
          ...variables,
          after: pageParam,
        },
      ),
    initialPageParam: variables.after,
    getNextPageParam: (lastPage) => {
      if (!lastPage.searchEmojis?.pageInfo.hasNextPage) return undefined;
      return lastPage.searchEmojis.pageInfo.endCursor;
    },
  });
}

export { getRaycastEmojisSearchInfiniteQueryOptions };
