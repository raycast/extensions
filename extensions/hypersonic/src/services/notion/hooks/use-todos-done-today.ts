import { parseTodosToDoneWorkString } from '@/features/todo-list/utils/parse-to-do-to-done-work-string'
import { loadDatabase } from '@/services/storage'
import { useCachedPromise } from '@raycast/utils'
import { getDoneToday } from '../operations/get-done-today'

export function useTodosDoneToday() {
  const { data, error, isLoading } = useCachedPromise(
    async () => {
      const database = await loadDatabase()
      const databaseId = database.databaseId

      if (!databaseId) {
        return '## Nothing for today'
      }

      const data = await getDoneToday(databaseId)
      const doneWorkString = parseTodosToDoneWorkString(data)

      const markdown = doneWorkString
        ? `${'## Tasks achieved 🎉'} ${doneWorkString}`
        : '## Nothing for today'

      return markdown
    },
    [],
    {
      initialData: '## Nothing for today',
      keepPreviousData: true,
    }
  )

  return {
    markdown: data,
    error,
    isLoading,
  }
}
