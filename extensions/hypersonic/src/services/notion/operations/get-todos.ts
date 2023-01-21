import { Todo } from '@/types/todo'
import { notion } from '../client'
import { loadPreferences } from '@/services/storage'
import { normalizeTodo } from '../utils/normalize-todo'
import { Filter } from '@/types/filter'

export async function getTodos({
  databaseId,
  filter,
}: {
  databaseId: string
  filter: Filter
}): Promise<Todo[]> {
  const notionClient = await notion()
  const preferences = await loadPreferences()
  const status = preferences.properties.status

  const donePropertyQuery =
    status.type === 'status' && status.doneName
      ? { status: { does_not_equal: status.doneName } }
      : { checkbox: { equals: false } }

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
          ...donePropertyQuery,
        },
        ...dynamicFiltersQuery,
      ],
    },
    sorts: [
      { property: status.name, direction: 'descending' },
      {
        property: preferences.properties.date,
        direction: 'ascending',
      },
      {
        timestamp: 'created_time',
        direction: 'descending',
      },
    ],
  })

  const todos = response.results.map((page) =>
    normalizeTodo({
      page,
      preferences: preferences.properties,
      inProgressId: status.inProgressId,
    })
  )

  return todos
}
