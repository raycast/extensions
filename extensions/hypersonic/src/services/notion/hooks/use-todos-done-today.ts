import { parseTodosToDoneWorkString } from '@/features/todo-list/utils/parse-to-do-to-done-work-string'
import { loadPreferences } from '@/services/storage'
import { Filter } from '@/types/filter'
import { useCachedPromise } from '@raycast/utils'
import { getDoneToday } from '../operations/get-done-today'

export function useTodosDoneToday(filter: Filter) {
  const { data, error, isLoading } = useCachedPromise(
    async () => {
      const preferences = await loadPreferences()
      const databaseId = preferences.databaseId

      if (!databaseId) {
        return '## Nothing for today'
      }

      const data = await getDoneToday(databaseId, filter)
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
