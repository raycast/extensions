import { ActionPanel, Icon, List } from '@raycast/api'
import DatabaseDetail from './components/DatabaseDetail'
import { RDB } from '@scaleway/sdk'
import { CONSOLE_URL, getScalewayClient } from './api/client'
import { useCachedPromise } from '@raycast/utils'
import { getDatabaseStatusIcon } from './helpers/databases'
import { getCountryImage } from './helpers'

export default function DatabasesView() {
  const api = new RDB.v1.API(getScalewayClient())

  const {
    data: databases,
    isLoading,
    revalidate: fetchDatabases,
  } = useCachedPromise(
    async () => {
      const response = await Promise.all(
        RDB.v1.API.LOCALITIES.map((region) => api.listInstances({ region }))
      )
      return response.map((r) => r.instances).flat()
    },
    [],
    { initialData: [] }
  )

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search databases...">
      {databases.map((database) => (
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
          detail={DatabaseDetail(database)}
          actions={
            <ActionPanel>
              <ActionPanel.Item.OpenInBrowser url={getDatabaseUrl(database)} />
              <ActionPanel.Item.CopyToClipboard
                title="Copy URL"
                content={getDatabaseUrl(database)}
              />
              <ActionPanel.Item
                title="Refresh"
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ['cmd'], key: 'r' }}
                onAction={() => fetchDatabases()}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}

function getDatabaseUrl(database: RDB.v1.Instance) {
  return `${CONSOLE_URL}/rdb/instances/${database.region}/${database.id}/overview`
}
