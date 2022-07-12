import { showToast, Toast } from '@raycast/api'
import { isNotionClientError } from '@notionhq/client'
import { Todo } from '@/types/todo'
import { notion } from '../client'
import { loadDatabase } from '@/services/storage'
import { mapPageToTodo } from '../utils/map-page-to-todo'

export async function getDoneToday(): Promise<Todo[]> {
  try {
    const notionClient = await notion()
    const database = await loadDatabase()
    const response = await notionClient.databases.query({
      database_id: database.databaseId,
      filter: {
        and: [
          {
            property: 'Done',
            checkbox: {
              equals: true,
            },
          },
          {
            or: [
              {
                property: 'Date',
                date: {
                  equals: new Date().toISOString().split('T')[0],
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

    const doneTodos = response.results.map(mapPageToTodo)

    return doneTodos
  } catch (err: unknown) {
    if (isNotionClientError(err)) {
      showToast(Toast.Style.Failure, err.message)
    } else {
      showToast(Toast.Style.Failure, 'Error occurred')
    }
    return []
  }
}
