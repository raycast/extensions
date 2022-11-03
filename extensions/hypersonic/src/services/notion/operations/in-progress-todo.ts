import { loadDoneProperty } from '@/services/storage'
import { TodoPage } from '@/types/todo-page'
import { getPreferenceValues } from '@raycast/api'
import { notion } from '../client'
import { mapPageToTodo } from '../utils/map-page-to-todo'

export async function inProgressTodo(pageId: string): Promise<any> {
  const notionClient = await notion()
  const preferences = getPreferenceValues()
  const status = await loadDoneProperty()

  const page = await notionClient.pages.update({
    page_id: pageId,
    properties: {
      [preferences.property_done]: {
        status: {
          id: status.inProgressId,
        },
      },
    },
  })

  return mapPageToTodo(page as TodoPage, preferences)
}
