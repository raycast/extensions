import { TodoPage } from '@/types/todo-page'
import { getPreferenceValues } from '@raycast/api'
import { notion } from '../client'
import { mapPageToTodo } from '../utils/map-page-to-todo'

export async function updateTodoTag(
  pageId: string,
  labelId: string | null
): Promise<any> {
  const notionClient = await notion()
  const preferences = getPreferenceValues()

  const page = await notionClient.pages.update({
    page_id: pageId,
    properties: {
      [preferences.property_label]: {
        select: labelId ? { id: labelId } : null,
      },
    },
  })

  return mapPageToTodo(page as TodoPage, preferences)
}
