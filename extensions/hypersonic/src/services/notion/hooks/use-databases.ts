import { useCachedPromise } from '@raycast/utils'
import { getDatabases } from '../operations/get-databases'

export function useDatabases() {
  const { data, error, isLoading, mutate, revalidate } = useCachedPromise(
    async () => {
      const databases = await getDatabases()
      return databases
    },
    [],
    {
      initialData: [],
      keepPreviousData: true,
    }
  )

  return {
    databases: data,
    error,
    isLoading,
    mutate,
    revalidate,
  }
}
