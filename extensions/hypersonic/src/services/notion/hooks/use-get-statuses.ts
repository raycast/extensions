import { useCachedPromise } from '@raycast/utils'
import { getStatuses } from '../operations/get-statuses'

export function useStatuses(databaseId: string) {
  const { data, error, isLoading } = useCachedPromise(
    async (databaseId) => {
      const statuses = await getStatuses(databaseId)
      return statuses
    },
    [databaseId],
    {
      initialData: [],
      keepPreviousData: true,
      execute: !!databaseId,
    }
  )

  return {
    statuses: data,
    error,
    isLoading,
  }
}
