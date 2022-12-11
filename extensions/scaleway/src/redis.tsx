import { ActionPanel, Icon, List } from '@raycast/api'
import RedisDetail from './components/RedisDetail'
import { Redis } from '@scaleway/sdk'
import { CONSOLE_URL, getScalewayClient } from './api/client'
import { useCachedPromise } from '@raycast/utils'
import { getRedisClusterStatusIcon } from './helpers/redis'
import { getCountryImage } from './helpers'

export default function RedisView() {
  const api = new Redis.v1.API(getScalewayClient())

  const {
    data: clusters,
    isLoading,
    revalidate: fetchClusters,
  } = useCachedPromise(
    async () => {
      const response = await Promise.all(
        Redis.v1.API.LOCALITIES.map((zone) => api.listClusters({ zone }))
      )
      return response.map((r) => r.clusters).flat()
    },
    [],
    { initialData: [] }
  )

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search cluster...">
      {clusters.map((cluster) => (
        <List.Item
          key={cluster.id}
          title={cluster.name}
          icon={getRedisClusterStatusIcon(cluster.status)}
          accessories={[
            {
              icon: getCountryImage(cluster.zone),
              tooltip: cluster.zone,
            },
          ]}
          detail={RedisDetail(cluster)}
          actions={
            <ActionPanel>
              <ActionPanel.Item.OpenInBrowser url={getRedisClusterUrl(cluster)} />
              <ActionPanel.Item.CopyToClipboard
                title="Copy URL"
                content={getRedisClusterUrl(cluster)}
              />
              <ActionPanel.Item
                title="Refresh"
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ['cmd'], key: 'r' }}
                onAction={() => fetchClusters()}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}

function getRedisClusterUrl(cluster: Redis.v1.Cluster) {
  return `${CONSOLE_URL}/redis/clusters/${cluster.zone}/${cluster.id}/overview`
}
