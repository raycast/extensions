import { TodoPage } from '@/types/todo-page'
import { getPreferenceValues } from '@raycast/api'
import { notion } from '../client'
import { mapPageToTodo } from '../utils/map-page-to-todo'

export async function updateTodoDate(
  pageId: string,
  date: string | null
): Promise<any> {
  const notionClient = await notion()
  const preferences = getPreferenceValues()

  const page = await notionClient.pages.update({
    page_id: pageId,
    properties: {
      [preferences.property_date]: {
        date: date
          ? {
              start: date,
            }
          : null,
      },
    },
  })

  return mapPageToTodo(page as TodoPage, preferences)
}
