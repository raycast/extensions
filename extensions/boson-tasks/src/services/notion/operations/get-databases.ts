import { Database } from '@/types/database'
import { DatabaseObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { notion } from '../client'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const LOG_FILE = join(homedir(), 'hypersonic-debug.log')

function log(message: string) {
  const line = `[${new Date().toISOString()}] ${message}\n`
  writeFileSync(LOG_FILE, line, { flag: 'a' })
  console.log(message)
}

export const NONE_VALUE = 'NONE_PROPERTY_SELECTED_123456'

export const TARGET_DATABASE_ID = '9ce156cd-41da-4a00-a6bc-beabf0adecdd'

export async function getDatabases(): Promise<Database[]> {
  const notionClient = await notion()

  log('Fetching target database directly from Notion...')
  const d = (await notionClient.databases.retrieve({
    database_id: TARGET_DATABASE_ID,
  })) as DatabaseObjectResponse
  log(
    `Fetched database: id=${d.id}, name=${d.title[0]?.plain_text || 'Untitled'}`
  )

  return [
    {
      id: d.id,
      name: d.title[0]?.plain_text || 'Untitled',
      url: d.url,
      value: JSON.stringify({
        id: d.id,
        name: d.title[0]?.plain_text || 'Untitled',
        url: d.url,
      }),
      image: normalizeImage(d.icon),
      columns: normalizeColumns(d.properties),
    },
  ]
}

const normalizeImage = (icon: DatabaseObjectResponse['icon']): string => {
  if (icon?.type === 'emoji') {
    return icon.emoji
  }

  if (icon?.type === 'external') {
    return icon.external?.url
  }

  return ''
}

const normalizeColumns = (
  properties: DatabaseObjectResponse['properties']
): Database['columns'] => {
  const propertiesValues = Object.values(properties)
  const columns: Database['columns'] = {
    title: [],
    date: [],
    status: [],
    project: [{ data: { databaseId: '', propertyName: 'None' }, value: '{}' }],
    assignee: [{ name: 'None', value: NONE_VALUE }],
    tags: [{ name: 'None', value: NONE_VALUE }],
    url: [{ name: 'None', value: NONE_VALUE }],
  }

  propertiesValues.forEach((item) => {
    if (item.type === 'title') {
      columns.title.push(item.name)
    }

    if (item.type === 'date') {
      columns.date.push(item.name)
    }

    if (item.type === 'status') {
      const completeGroup = item.status.groups[2]

      const completedOptions = item.status?.options
        .filter((option) => completeGroup?.option_ids.includes(option.id))
        .map((option) => option.name)

      const data = {
        type: item.type,
        name: item.name,
        doneName: item.status?.options[item.status.options.length - 1]?.name,
        completedStatuses: completedOptions,
        inProgressId:
          item.status.groups[1].option_ids[
            item.status.groups[1].option_ids.length - 1
          ],
        notStartedId:
          item.status.groups[0].option_ids[
            item.status.groups[0].option_ids.length - 1
          ],
      }

      columns.status.unshift({ data, value: JSON.stringify(data) })
    }

    if (item.type === 'checkbox') {
      const data = {
        type: item.type,
        name: item.name,
      }

      columns.status.unshift({
        data,
        value: JSON.stringify(data),
      })
    }

    if (item.type === 'relation') {
      const data = {
        databaseId: item.relation.database_id,
        propertyName: item.name,
      }

      columns.project.unshift({ data, value: JSON.stringify(data) })
    }

    if (item.type === 'people') {
      columns.assignee.unshift({ name: item.name, value: item.name })
    }

    if (item.type === 'select') {
      columns.tags.unshift({ name: item.name, value: item.name })
    }

    if (item.type === 'url') {
      columns.url.unshift({ name: item.name, value: item.name })
    }
  })

  return columns
}
