import { useCachedPromise } from '@raycast/utils'
import { getStatuses } from '../operations/get-statuses'

export function useStatuses(databaseName: string) {
  const { data, error, isLoading } = useCachedPromise(
    async (databaseName) => {
      const statuses = await getStatuses(databaseName)
      return statuses
    },
    [databaseName],
    {
      initialData: [],
      keepPreviousData: true,
      execute: !!databaseName,
    }
  )

  return {
    statuses: data,
    error,
    isLoading,
  }
}
