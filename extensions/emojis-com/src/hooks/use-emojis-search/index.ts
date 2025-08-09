import { useInfiniteQuery } from "@tanstack/react-query"

import type {
  SearchEmojisQuery,
  SearchEmojisQueryVariables,
} from "@/hooks/use-emojis-search/graphql/search-emojis.generated"
import { getEmojisSearchInfiniteQueryOptions } from "@/hooks/use-emojis-search/utils"
import { graphqlClient } from "@/utils/graphql"

type Emoji = NonNullable<NonNullable<SearchEmojisQuery["searchEmojis"]>["nodes"]>[number]

function useEmojisSearch({ variables }: { variables: SearchEmojisQueryVariables }) {
  return useInfiniteQuery(getEmojisSearchInfiniteQueryOptions({ graphqlClient, variables }))
}

export { useEmojisSearch }
export type { Emoji }
