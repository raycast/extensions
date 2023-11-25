import { loadPreferences } from '@/services/storage'
import { notion } from '../client'

export async function setStatusTodo(
  pageId: string,
  statusId: string
): Promise<boolean> {
  const preferences = await loadPreferences()
  const status = preferences.properties.status

  const notionClient = await notion()
  await notionClient.pages.update({
    page_id: pageId,
    properties: {
      [status.name]: {
        status: {
          id: statusId,
        },
      },
    },
  })

  return true
}
