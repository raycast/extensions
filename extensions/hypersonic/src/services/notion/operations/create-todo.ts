import { Todo } from '@/types/todo'
import { notion } from '../client'
import { loadPreferences } from '@/services/storage'
import { normalizeTodo } from '../utils/normalize-todo'

export async function createTodo(
  todo: Todo,
  databaseId: string
): Promise<Todo> {
  const notionClient = await notion()
  const preferences = await loadPreferences()

  const data = await notionClient.pages.create({
    parent: { database_id: databaseId },
    properties: {
      [preferences.properties.title]: {
        title: [
          {
            text: {
              content: todo.title,
            },
          },
        ],
      },
      [preferences.properties.date]: {
        date: todo?.dateValue ? { start: todo.dateValue } : null,
      },
      ...(preferences.properties.tag
        ? {
            [preferences.properties.tag]: {
              select: todo?.tag?.id ? { id: todo?.tag?.id } : null,
            },
          }
        : {}),
      ...(preferences.properties.project
        ? {
            [preferences.properties.project]: {
              relation: todo?.projectId ? [{ id: todo.projectId }] : [],
            },
          }
        : {}),
      ...(preferences.properties.assignee
        ? {
            [preferences.properties.assignee]: {
              people: todo?.user?.id ? [{ id: todo?.user?.id }] : [],
            },
          }
        : {}),
    },
  })

  const normalizedTodo = normalizeTodo({
    page: data,
    preferences: preferences.properties,
    inProgressId: preferences.properties.status.inProgressId,
  })

  return normalizedTodo
}
