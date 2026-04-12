import { loadPreferences } from '@/services/storage'
import { notion } from '../client'

export async function updateTodoProject(
  pageId: string,
  projectId: string | null
): Promise<any> {
  const notionClient = await notion()
  const preferences = await loadPreferences()

  if (!preferences.properties.project) return false

  await notionClient.pages.update({
    page_id: pageId,
    properties: {
      [preferences.properties.project]: {
        relation: projectId ? [{ id: projectId }] : [],
      },
    },
  })

  return true
}
