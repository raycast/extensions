import { Tag } from '@/types/tag'
import { notion } from '../client'
import { loadPreferences } from '@/services/storage'
import { normalizeTag } from '../utils/normalize-tag'

export async function getTags(databaseName: string): Promise<Tag[]> {
  const preferences = await loadPreferences()
  const tagProperty = preferences.properties.tag

  if (!tagProperty) return []

  const notionClient = await notion()
  const databases = await notionClient.search({
    query: databaseName,
    filter: { property: 'object', value: 'database' },
  })

  const database = databases.results[0] as any
  const availableTags = database?.properties[tagProperty]?.select?.options ?? []

  return availableTags.map(normalizeTag)
}
