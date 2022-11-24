import { getTodos } from '@/services/notion/operations/get-todos'
import { Filter } from '@/types/filter'
import { useCachedPromise } from '@raycast/utils'

export function useTodos({
  databaseId,
  filter,
}: {
  databaseId: string
  filter: Filter
}) {
  const { data, error, isLoading, mutate, revalidate } = useCachedPromise(
    async (databaseId, filter) => {
      const todos = await getTodos({ databaseId, filter })
      return todos
    },
    [databaseId, filter],
    {
      initialData: [],
      keepPreviousData: true,
      execute: !!databaseId,
    }
  )

  return {
    todos: data,
    error,
    isLoading,
    revalidate,
    mutate,
  }
}
