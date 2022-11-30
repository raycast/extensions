import { getDatabase } from '@/services/notion/operations/get-database'
import { useCachedPromise } from '@raycast/utils'

export function useDatabase() {
  const { data, error, isLoading, mutate, revalidate } = useCachedPromise(
    getDatabase,
    [],
    {
      initialData: {
        tags: [],
      },
      keepPreviousData: true,
    }
  )

  return {
    database: data,
    error,
    isLoading,
    mutate,
    revalidate,
  }
}
