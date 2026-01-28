import { useCachedPromise } from '@raycast/utils'
import { getTags } from '../operations/get-tags'

export function useTags(databaseName: string) {
  const { data, error, isLoading } = useCachedPromise(
    async (databaseName) => {
      const tags = await getTags(databaseName)
      return tags
    },
    [databaseName],
    {
      initialData: [],
      keepPreviousData: true,
      execute: !!databaseName,
    }
  )

  return {
    tags: data,
    error,
    isLoading,
  }
}
