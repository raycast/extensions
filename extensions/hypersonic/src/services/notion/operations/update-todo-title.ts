import { loadPreferences } from '@/services/storage'
import { notion } from '../client'

export async function updateTodoTitle(
  pageId: string,
  title: string
): Promise<boolean> {
  const notionClient = await notion()
  const preferences = await loadPreferences()

  if (!preferences.properties.title) return false

  await notionClient.pages.update({
    page_id: pageId,
    properties: {
      [preferences.properties.title]: {
        title: [
          {
            text: {
              content: title,
            },
          },
        ],
      },
    },
  })

  return true
}
