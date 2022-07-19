import { getPreferenceValues, showToast, Toast } from '@raycast/api'
import { isNotionClientError } from '@notionhq/client'
import { Todo } from '@/types/todo'
import { notion } from '../client'
import { storeTodos } from '@/services/storage'
import { mapPageToTodo } from '../utils/map-page-to-todo'

export async function getTodos(
  databaseId: string,
  localTodos: Todo[]
): Promise<Todo[]> {
  try {
    const notionClient = await notion()
    const preferences = getPreferenceValues()
    const time_now = new Date()
    const time_now_locale = new Date(
      time_now.getTime() - time_now.getTimezoneOffset() * 60000
    )
    const today_now = time_now_locale.toISOString().split('T')[0]
    const response =
      preferences.property_cancel == ''
        ? await notionClient.databases.query({
            database_id: databaseId,
            filter: {
              and: [
                {
                  property: preferences.property_done,
                  checkbox: {
                    equals: false,
                  },
                },
                {
                  or: [
                    {
                      property: preferences.property_date,
                      date: {
                        on_or_before: today_now,
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
        : await notionClient.databases.query({
            database_id: databaseId,
            filter: {
              and: [
                {
                  property: preferences.property_done,
                  checkbox: {
                    equals: false,
                  },
                },
                {
                  property: preferences.property_cancel,
                  checkbox: {
                    equals: false,
                  },
                },
                {
                  or: [
                    {
                      property: preferences.property_date,
                      date: {
                        on_or_before: today_now,
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

    const todos = response.results.map(mapPageToTodo)

    const sortedTodos = todos
      .map((todo: any) => {
        const localTodoIndex = localTodos.findIndex((t) => t.id === todo.id)

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
  } catch (err: unknown) {
    if (isNotionClientError(err)) {
      showToast(Toast.Style.Failure, err.message)
    } else {
      showToast(Toast.Style.Failure, 'Error occurred')
    }
    return []
  }
}
