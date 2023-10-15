import { loadPreferences } from '@/services/storage'
import { notion } from '../client'

export async function notStartedTodo(pageId: string): Promise<boolean> {
  const preferences = await loadPreferences()
  const status = preferences.properties.status

  if (!status.notStartedId) return false

  const notionClient = await notion()
  await notionClient.pages.update({
    page_id: pageId,
    properties: {
      [status.name]: {
        status: {
          id: status.notStartedId,
        },
      },
    },
  })

  return true
}
