import { useLocalDatabase } from '@/services/notion/hooks/use-local-database'
import { useTodos } from '@/services/notion/hooks/use-todos'
import { completeTodo } from '@/services/notion/operations/complete-todo'
import { storeHasDoneToday } from '@/services/storage'
import { Todo } from '@/types/todo'
import { MenuBarExtra } from '@raycast/api'
import { getProgressIcon } from '@raycast/utils'

export function MenuBar() {
  const { database, isLoading: isLoadingDb } = useLocalDatabase()
  const { todos, error, isLoading, mutate } = useTodos(
    database.databaseId,
    isLoadingDb
  )

  const handleComplete = async (todo: Todo) => {
    await mutate(completeTodo(todo.id), {
      optimisticUpdate(data) {
        if (!data) return data
        return data.filter((t) => t.id !== todo.id)
      },
      shouldRevalidateAfter: true,
    })

    await storeHasDoneToday()
  }

  return (
    <MenuBarExtra
      isLoading={isLoading}
      title={`${todos?.length || 0}`}
      icon={{
        source: {
          dark: 'light-hypersonic.png',
          light: 'dark-hypersonic.png',
        },
      }}
    >
      {error ? <MenuBarExtra.Item title={error.message} /> : null}

      {!isLoading && !error && todos && todos.length === 0 ? (
        <MenuBarExtra.Item title="No Todos" />
      ) : null}

      {!error
        ? todos?.map((todo) => (
            <MenuBarExtra.Item
              onAction={() => handleComplete(todo)}
              key={todo.id}
              icon={{
                source: {
                  light: getProgressIcon(todo.inProgress ? 0.5 : 0, '#E0A905'),
                  dark: getProgressIcon(todo.inProgress ? 0.5 : 0, '#edc03c'),
                },
              }}
              title={todo.title}
            />
          ))
        : null}
    </MenuBarExtra>
  )
}
