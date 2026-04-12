import { loadPreferences } from '@/services/storage'
import { useCachedPromise } from '@raycast/utils'
import { TARGET_DATABASE_ID } from '../operations/get-databases'

export function useLocalPreferences() {
  const { data, error, isLoading, mutate, revalidate } = useCachedPromise(
    async () => {
      const prefs = await loadPreferences()
      // Always override to use the hardcoded target database
      if (prefs.databaseId && prefs.databaseId !== TARGET_DATABASE_ID) {
        prefs.databaseId = TARGET_DATABASE_ID
      }
      return prefs
    },
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
