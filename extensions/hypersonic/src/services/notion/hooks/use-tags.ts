import { useCachedPromise } from '@raycast/utils'
import { getTags } from '../operations/get-tags'

export function useTags(databaseId: string) {
  const { data, error, isLoading } = useCachedPromise(
    async (databaseId) => {
      const tags = await getTags(databaseId)
      return tags
    },
    [databaseId],
    {
      initialData: [],
      keepPreviousData: true,
      execute: !!databaseId,
    }
  )

  return {
    tags: data,
    error,
    isLoading,
  }
}
