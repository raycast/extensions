import { loadPreferences } from '@/services/storage'
import { notion } from '../client'

export async function updateTodoUser(
  pageId: string,
  userId: string | null
): Promise<boolean> {
  const notionClient = await notion()
  const preferences = await loadPreferences()

  if (!preferences.properties.assignee) return false

  await notionClient.pages.update({
    page_id: pageId,
    properties: {
      [preferences.properties.assignee]: {
        people: userId ? [{ id: userId }] : [],
      },
    },
  })

  return true
}
