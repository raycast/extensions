import { loadPreferences } from '@/services/storage'
import { useCachedPromise } from '@raycast/utils'

export function useLocalPreferences() {
  const { data, error, isLoading, mutate, revalidate } = useCachedPromise(
    loadPreferences,
    [],
    {
      initialData: {},
      keepPreviousData: true,
    }
  )

  return {
    preferences: data,
    error,
    isLoading,
    mutate,
    revalidatePreferences: revalidate,
  }
}
