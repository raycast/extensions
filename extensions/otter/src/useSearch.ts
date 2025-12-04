import { useCachedPromise } from '@raycast/utils'
import { useFetchSearchItems } from './utils/fetchItems'

export function useSearch(searchTerm: string, tag: string) {
  const { data, isLoading, revalidate } = useCachedPromise(
    async (searchTerm, tag) => {
      const theTag = tag === 'all' ? undefined : tag
      return await useFetchSearchItems(searchTerm, theTag)
    },
    [searchTerm, tag],
  )

  return { data: data?.data, error: data?.error, isLoading, revalidate }
}
