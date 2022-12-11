import { loadPreferences } from '@/services/storage'
import { notion } from '../client'

export async function inProgressTodo(pageId: string): Promise<boolean> {
  const preferences = await loadPreferences()
  const status = preferences.properties.status

  if (!status.inProgressId) return false

  const notionClient = await notion()
  await notionClient.pages.update({
    page_id: pageId,
    properties: {
      [status.name]: {
        status: {
          id: status.inProgressId,
        },
      },
    },
  })

  return true
}
