import { usePromise } from '@raycast/utils'
import { getDatabases } from '../operations/get-databases'

export function useDatabases() {
  const { data, error, isLoading, mutate, revalidate } =
    usePromise(async () => {
      const databases = await getDatabases()
      return databases
    }, [])

  return {
    databases: data || [],
    error,
    isLoading,
    mutate,
    revalidate,
  }
}
