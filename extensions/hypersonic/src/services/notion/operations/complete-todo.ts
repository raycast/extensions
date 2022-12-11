import { loadPreferences } from '@/services/storage'
import { notion } from '../client'

export async function completeTodo(pageId: string): Promise<boolean> {
  const notionClient = await notion()
  const preferences = await loadPreferences()
  const status = preferences.properties.status

  await notionClient.pages.update({
    page_id: pageId,
    properties: {
      ...(status.type === 'checkbox'
        ? {
            [status.name]: {
              checkbox: true,
            },
          }
        : {}),
      ...(!!status?.doneName && status.type === 'status'
        ? {
            [status.name]: {
              status: {
                name: status.doneName,
              },
            },
          }
        : {}),
      [preferences.properties.date]: {
        date: { start: new Date().toISOString().split('T')[0] },
      },
    },
  })

  return true
}
