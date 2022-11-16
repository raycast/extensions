import { loadDoneProperty } from '@/services/storage'
import { TodoPage } from '@/types/todo-page'
import { getPreferenceValues } from '@raycast/api'
import { notion } from '../client'
import { mapPageToTodo } from '../utils/map-page-to-todo'

export async function completeTodo(pageId: string): Promise<any> {
  const notionClient = await notion()
  const preferences = getPreferenceValues()
  const status = await loadDoneProperty()

  const page = await notionClient.pages.update({
    page_id: pageId,
    properties: {
      ...(status.type === 'checkbox'
        ? {
            [preferences.property_done]: {
              checkbox: true,
            },
          }
        : {}),
      ...(!!status?.doneName && status.type === 'status'
        ? {
            [preferences.property_done]: {
              status: {
                name: status.doneName,
              },
            },
          }
        : {}),
      [preferences.property_date]: {
        date: { start: new Date().toISOString().split('T')[0] },
      },
    },
  })

  return mapPageToTodo(page as TodoPage, preferences)
}
