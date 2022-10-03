import { storeDatabase, storeDoneProperty } from '@/services/storage'
import { Tag } from '@/types/tag'
import { getPreferenceValues } from '@raycast/api'
import { notion } from '../client'
import { formatNotionUrl } from '../utils/format-notion-url'
import { mapPageTag } from '../utils/map-page-tag'

export async function getDatabase(): Promise<{
  databaseId: string
  databaseUrl: string
  normalizedUrl: string
  tags: Tag[]
  hasStatusProperty: boolean
}> {
  const notionClient = await notion()
  const preferences = getPreferenceValues()

  const databases = await notionClient.search({
    query: preferences.database_name,
    filter: { property: 'object', value: 'database' },
  })

  const database: any = databases.results[0]

  if (!database?.id) {
    throw new Error(
      'Database not found, please check your database name in preferences'
    )
  }

  // Get database id and url
  const databaseId = database.id
  const databaseUrl = database.url
  const normalizedUrl = formatNotionUrl(databaseUrl)

  // Get all tags
  const availableTags: any[] =
    database?.properties[preferences.property_label]?.select?.options ?? []
  const tags = availableTags.map(mapPageTag)

  // Get done property and identify if its a checkbox or status
  const propertyDone = database?.properties[preferences.property_done]
  const propertyDoneType = propertyDone?.type
  const statusPropertyOptions = propertyDone?.status
  const statusInProgressId =
    statusPropertyOptions?.groups[1]?.option_ids[
      statusPropertyOptions?.groups[1].option_ids.length - 1
    ]
  const statusDoneName =
    statusPropertyOptions?.options[statusPropertyOptions.options.length - 1]
      ?.name

  // Store database and done property
  await storeDatabase({ databaseId, databaseUrl })
  await storeDoneProperty({
    doneName: statusDoneName,
    inProgressId: statusInProgressId,
    type: propertyDoneType,
  })

  return {
    databaseId,
    databaseUrl,
    tags,
    normalizedUrl,
    hasStatusProperty: propertyDoneType === 'status',
  }
}
