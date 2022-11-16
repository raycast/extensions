import { getPreferenceValues } from '@raycast/api'
import { Todo } from '@/types/todo'
import { notion } from '../client'
import { loadDoneProperty, loadTodos, storeTodos } from '@/services/storage'
import { mapPageToTodo } from '../utils/map-page-to-todo'
import { checkColumnHeaders } from '../utils/check-column-headers'

export async function getTodos(databaseId: string): Promise<Todo[]> {
  const notionClient = await notion()
  const preferences = getPreferenceValues()
  const status = await loadDoneProperty()

  if (!status?.type) {
    throw new Error(
      'Status or checkbox property not found, please check your preferences'
    )
  }

  const donePropertyQuery =
    status.type === 'checkbox'
      ? { checkbox: { equals: false } }
      : { status: { does_not_equal: status.doneName } }

  const response = await notionClient.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        {
          property: preferences.property_done,
          ...donePropertyQuery,
        },
        {
          or: [
            {
              property: preferences.property_date,
              date: {
                before: new Date().toISOString(),
              },
            },
            {
              property: preferences.property_date,
              date: {
                is_empty: true,
              },
            },
          ],
        },
      ],
    },
    sorts: [
      {
        timestamp: 'created_time',
        direction: 'ascending',
      },
    ],
  })

  checkColumnHeaders(response.results[0], preferences)

  const todos = response.results.map((page) =>
    mapPageToTodo(page, preferences, status.inProgressId)
  )

  const localTodos = await loadTodos()

  const sortedTodos = todos
    .map((todo: any) => {
      const localTodoIndex = localTodos?.findIndex((t) => t.id === todo.id)

      if (localTodoIndex !== -1) {
        todo.position = localTodoIndex
      } else {
        todo.position = 0
      }

      return todo
    })
    .sort((a, b) => a.position - b.position)

  await storeTodos(sortedTodos)

  return sortedTodos
}
