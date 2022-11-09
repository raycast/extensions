import { ActionPanel, List } from '@raycast/api'
import { catchError, ScalewayAPI } from './scaleway/api'
import { useEffect, useState } from 'react'
import { Database } from './scaleway/types'
import { getCountryImage, getDatabaseStatusIcon } from './utils'
import DatabaseDetails from './databases/database-details'
import { DatabasesAPI } from './scaleway/databases-api'

interface DatabasesState {
  isLoading: boolean
  databases: Database[]
  error?: unknown
}

export default function Databases() {
  const [state, setState] = useState<DatabasesState>({ databases: [], isLoading: true })

  async function fetchDatabases() {
    setState((previous) => ({ ...previous, isLoading: true }))

    try {
      const databases = await DatabasesAPI.getAllDatabases()

      setState((previous) => ({ ...previous, databases, isLoading: false }))
    } catch (error) {
      await catchError(error)
      setState((previous) => ({
        ...previous,
        error: error instanceof Error ? error : new Error('Something went wrong'),
        isLoading: false,
        databases: [],
      }))
    }
  }

  useEffect(() => {
    fetchDatabases().then()
  }, [])

  return (
    <List isLoading={state.isLoading} isShowingDetail searchBarPlaceholder="Search databases...">
      {state.databases.map((database) => (
        <List.Item
          key={database.id}
          title={database.name}
          icon={getDatabaseStatusIcon(database.status)}
          accessories={[
            {
              icon: getCountryImage(database.region),
              tooltip: database.region,
            },
          ]}
          detail={DatabaseDetails(database)}
          actions={
            <ActionPanel>
              <ActionPanel.Item.OpenInBrowser url={getDatabaseUrl(database)} />
              <ActionPanel.Item.CopyToClipboard
                title="Copy URL"
                content={getDatabaseUrl(database)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}

function getDatabaseUrl(database: Database) {
  return `${ScalewayAPI.CONSOLE_URL}/rdb/instances/${database.region}/${database.id}/overview`
}
