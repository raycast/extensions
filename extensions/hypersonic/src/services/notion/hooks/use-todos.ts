import { getDatabase } from '@/services/notion/operations/get-database'
import { getTodos } from '@/services/notion/operations/get-todos'
import { loadDatabase, loadTodos } from '@/services/storage'
import { useCachedPromise } from '@raycast/utils'

export function useTodos() {
  const { data, error, isLoading, mutate, revalidate } = useCachedPromise(
    async () => {
      const database = await loadDatabase()
      const localTodos = await loadTodos()
      let databaseId = database.databaseId

      if (!databaseId) {
        const data = await getDatabase()
        databaseId = data.databaseId
      }

      const data = await getTodos({ databaseId, localTodos })

      return data
    },
    [],
    {
      initialData: [],
      keepPreviousData: true,
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
