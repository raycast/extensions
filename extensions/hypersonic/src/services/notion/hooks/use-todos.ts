import { getTodos } from '@/services/notion/operations/get-todos'
import { useCachedPromise } from '@raycast/utils'

export function useTodos(databaseId: string, loadingDb: boolean) {
  const { data, error, isLoading, mutate, revalidate } = useCachedPromise(
    async (databaseId: string) => {
      const todos = await getTodos(databaseId)
      return todos
    },
    [databaseId],
    {
      initialData: [],
      keepPreviousData: true,
      execute: !loadingDb && !!databaseId,
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
