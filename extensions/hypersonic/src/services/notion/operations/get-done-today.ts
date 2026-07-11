import { Todo } from '@/types/todo'
import { notion } from '../client'
import { loadPreferences } from '@/services/storage'
import { normalizeTodo } from '../utils/normalize-todo'
import { Filter } from '@/types/filter'

export async function getDoneToday(
  databaseId: string,
  filter: Filter
): Promise<Todo[]> {
  const notionClient = await notion()
  const preferences = await loadPreferences()
  const status = preferences.properties.status

  const dynamicFiltersQuery = [
    ...(filter?.projectId && preferences.properties.project
      ? [
          {
            property: preferences.properties.project,
            relation: { contains: filter.projectId },
          },
        ]
      : []),
    ...(filter?.user?.id && preferences.properties.assignee
      ? [
          {
            property: preferences.properties.assignee,
            people: { contains: filter.user.id },
          },
        ]
      : []),
    ...(filter?.tag?.id && preferences.properties.tag
      ? [
          {
            property: preferences.properties.tag,
            select: { equals: filter.tag.name },
          },
        ]
      : []),
  ]

  const response = await notionClient.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        {
          property: status.name,
          ...(status.type === 'status' && status.doneName
            ? { status: { equals: status.doneName } }
            : {
                checkbox: {
                  equals: true,
                },
              }),
        },
        {
          property: preferences.properties.date,
          date: {
            equals: new Date().toISOString().split('T')[0],
          },
        },
        ...dynamicFiltersQuery,
      ],
    },
    sorts: [
      {
        timestamp: 'created_time',
        direction: 'descending',
      },
    ],
  })

  return response.results.map((page) =>
    normalizeTodo({ page, preferences: preferences.properties })
  )
}
