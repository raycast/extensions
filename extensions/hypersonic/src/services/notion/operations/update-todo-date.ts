import { loadPreferences } from '@/services/storage'
import { notion } from '../client'

export async function updateTodoDate(
  pageId: string,
  date: string | null
): Promise<boolean> {
  const notionClient = await notion()
  const preferences = await loadPreferences()

  await notionClient.pages.update({
    page_id: pageId,
    properties: {
      [preferences.properties.date]: {
        date: date
          ? {
              start: date,
            }
          : null,
      },
    },
  })

  return true
}
