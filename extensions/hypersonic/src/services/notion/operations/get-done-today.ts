import { getPreferenceValues } from '@raycast/api'
import { Todo } from '@/types/todo'
import { notion } from '../client'
import { loadDoneProperty } from '@/services/storage'
import { mapPageToTodo } from '../utils/map-page-to-todo'

export async function getDoneToday(databaseId: string): Promise<Todo[]> {
  const notionClient = await notion()
  const preferences = getPreferenceValues()
  const status = await loadDoneProperty()

  const response = await notionClient.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        {
          property: preferences.property_done,
          ...(status.type === 'checkbox'
            ? {
                checkbox: {
                  equals: true,
                },
              }
            : { status: { equals: status.doneName } }),
        },
        {
          property: preferences.property_date,
          date: {
            equals: new Date().toISOString().split('T')[0],
          },
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

  return response.results.map((page) => mapPageToTodo(page, preferences))
}
