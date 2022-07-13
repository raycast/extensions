import { showToast, Toast } from '@raycast/api'
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
    const response = await notionClient.databases.query({
      database_id: databaseId,
      filter: {
        and: [
          {
            property: 'Done',
            checkbox: {
              equals: false,
            },
          },
          {
            or: [
              {
                property: 'Date',
                date: {
                  before: new Date() as any,
                },
              },
            ],
          },
        ],
      },
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'descending',
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
