import { storeDatabase, storeTags } from '@/services/storage'
import { Tag } from '@/types/tag'
import { isNotionClientError } from '@notionhq/client'
import { getPreferenceValues, showToast, Toast } from '@raycast/api'
import { notion } from '../client'
import { mapPageTag } from '../utils/map-page-tag'

export async function getDatabase(): Promise<{
  databaseId: string
  databaseUrl: string
  tags: Tag[]
}> {
  try {
    const notionClient = await notion()

    const databases = await notionClient.search({
      query: getPreferenceValues().database_name,
      filter: { property: 'object', value: 'database' },
    })

    const database: any = databases.results[0]
    const databaseId = database.id
    const databaseUrl = database.url
    const availableTags: any[] =
      database?.properties['Label']?.select?.options ?? []

    const tags = availableTags.map(mapPageTag)
    await storeDatabase({ databaseId, databaseUrl })
    await storeTags(tags)

    return { databaseId, databaseUrl, tags }
  } catch (err: unknown) {
    if (isNotionClientError(err)) {
      showToast(Toast.Style.Failure, err.message)
    } else {
      showToast(Toast.Style.Failure, 'Failed to fetch database')
    }
    return { databaseId: '', databaseUrl: '', tags: [] }
  }
}
