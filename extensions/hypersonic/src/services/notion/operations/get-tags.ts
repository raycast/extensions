import { Tag } from '@/types/tag'
import { notion } from '../client'
import { loadPreferences } from '@/services/storage'
import { normalizeTag } from '../utils/normalize-tag'

export async function getTags(databaseId: string): Promise<Tag[]> {
  const preferences = await loadPreferences()
  const tagProperty = preferences.properties.tag

  if (!tagProperty) return []

  const notionClient = await notion()
  const database = (await notionClient.databases.retrieve({
    database_id: databaseId,
  })) as any

  const availableTags = database?.properties[tagProperty]?.select?.options ?? []

  return availableTags.map(normalizeTag)
}
