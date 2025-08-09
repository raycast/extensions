import { infiniteQueryOptions } from "@tanstack/react-query"
import type { GraphQLClient } from "graphql-request"

import type {
  SearchEmojisQuery,
  SearchEmojisQueryVariables,
} from "@/hooks/use-emojis-search/graphql/search-emojis.generated"
import { SearchEmojisDocument } from "@/hooks/use-emojis-search/graphql/search-emojis.generated"

function getEmojisSearchInfiniteQueryOptions({
  graphqlClient,
  variables,
}: {
  graphqlClient: GraphQLClient
  variables: SearchEmojisQueryVariables
}) {
  return infiniteQueryOptions({
    queryKey: ["emojis-search-infinite", variables],
    queryFn: ({ pageParam }) =>
      graphqlClient.request<SearchEmojisQuery, SearchEmojisQueryVariables>(SearchEmojisDocument, {
        ...variables,
        after: pageParam,
      }),
    initialPageParam: variables.after,
    getNextPageParam: (lastPage) => {
      if (!lastPage.searchEmojis?.pageInfo.hasNextPage) return undefined
      return lastPage.searchEmojis.pageInfo.endCursor
    },
  })
}

export { getEmojisSearchInfiniteQueryOptions }
