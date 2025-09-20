import { loadPreferences } from '@/services/storage'
import { notion } from '../client'

export async function updateTodoTag(
  pageId: string,
  labelId: string | null
): Promise<boolean> {
  const notionClient = await notion()
  const preferences = await loadPreferences()

  if (!preferences.properties.tag) return false

  await notionClient.pages.update({
    page_id: pageId,
    properties: {
      [preferences.properties.tag]: {
        select: labelId ? { id: labelId } : null,
      },
    },
  })

  return true
}
