import { mapPageToTodo } from '../utils/map-page-to-todo'
import { Todo } from '@/types/todo'
import { notion } from '../client'
import { TodoPage } from '@/types/todo-page'
import { getPreferenceValues } from '@raycast/api'

export async function createTodo(
  todo: { title: string; tagId: string | null },
  databaseId: string
): Promise<Todo> {
  const notionClient = await notion()
  const preferences = getPreferenceValues()

  const page = await notionClient.pages.create({
    parent: { database_id: databaseId },
    properties: {
      [preferences.property_title]: {
        title: [
          {
            text: {
              content: todo.title,
            },
          },
        ],
      },
      [preferences.property_label]: {
        select: todo.tagId ? { id: todo.tagId } : null,
      },
      [preferences.property_date]: {
        date: { start: new Date().toISOString().split('T')[0] },
      },
    },
  })

  return mapPageToTodo(page as TodoPage, preferences)
}
