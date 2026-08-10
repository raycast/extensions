import { useCachedPromise } from '@raycast/utils'
import { getUsers } from '../operations/get-users'

export function useUsers() {
  const { data, error, isLoading, mutate, revalidate } = useCachedPromise(
    async () => {
      const users = await getUsers()
      return users
    },
    [],
    {
      initialData: [],
      keepPreviousData: true,
    }
  )

  return {
    users: data,
    error,
    isLoading,
    mutate,
    revalidate,
  }
}
