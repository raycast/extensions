import { notion } from '../client'
import { loadPreferences } from '@/services/storage'
import { Status } from '@/types/status'
import { normalizeStatus } from '../utils/normalize-status'

export async function getStatuses(databaseId: string): Promise<Status[]> {
  const preferences = await loadPreferences()
  const statusProperty = preferences.properties.status

  if (!statusProperty || statusProperty.type === 'checkbox') {
    const status = normalizeStatus(
      { id: 'no-status', name: 'Todo' },
      { 'no-status': { name: 'To-do', index: 0 } }
    )

    return [status]
  }

  const notionClient = await notion()
  const database = (await notionClient.databases.retrieve({
    database_id: databaseId,
  })) as any

  const options = database?.properties[statusProperty.name]?.status?.options
  const groups = database?.properties[statusProperty.name]?.status?.groups

  if (!groups) {
    const status = normalizeStatus(
      { id: 'no-status', name: 'Todo' },
      { 'no-status': { name: 'To-do', index: 0 } }
    )

    return [status]
  }

  const statusIdWithGroup: Record<string, { name: string; index: number }> = {}
  groups.forEach((group: any) => {
    group.option_ids.forEach((id: string, index: number) => {
      statusIdWithGroup[id] = { name: group.name, index: index }
    })
  })

  const statuses = options
    .map((item: unknown) => normalizeStatus(item, statusIdWithGroup))
    .reverse()

  return statuses
}
