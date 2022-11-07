import { loadDatabase } from '@/services/storage'
import { useCachedPromise } from '@raycast/utils'

export function useLocalDatabase() {
  const { data, error, isLoading, mutate, revalidate } = useCachedPromise(
    loadDatabase,
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
