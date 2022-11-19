import { ActionPanel, List } from '@raycast/api'
import { catchError, ScalewayAPI } from './scaleway/api'
import { useEffect, useState } from 'react'
import { RedisCluster } from './scaleway/types'
import { getCountryImage, getRedisClusterStatusIcon } from './utils'
import { RedisAPI } from './scaleway/redis-api'
import RedisDetails from './redis/redis-details'

interface RedisState {
  isLoading: boolean
  clusters: RedisCluster[]
  error?: unknown
}

export default function Redis() {
  const [state, setState] = useState<RedisState>({ clusters: [], isLoading: true })

  async function fetchClusters() {
    setState((previous) => ({ ...previous, isLoading: true }))

    try {
      const clusters = await RedisAPI.getAllClusters()

      setState((previous) => ({ ...previous, clusters, isLoading: false }))
    } catch (error) {
      await catchError(error)
      setState((previous) => ({
        ...previous,
        error: error instanceof Error ? error : new Error('Something went wrong'),
        isLoading: false,
        clusters: [],
      }))
    }
  }

  useEffect(() => {
    fetchClusters().then()
  }, [])

  return (
    <List isLoading={state.isLoading} isShowingDetail searchBarPlaceholder="Search cluster...">
      {state.clusters.map((cluster) => (
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
          detail={RedisDetails(cluster)}
          actions={
            <ActionPanel>
              <ActionPanel.Item.OpenInBrowser url={getRedisClusterUrl(cluster)} />
              <ActionPanel.Item.CopyToClipboard
                title="Copy URL"
                content={getRedisClusterUrl(cluster)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}

function getRedisClusterUrl(cluster: RedisCluster) {
  return `${ScalewayAPI.CONSOLE_URL}/redis/clusters/${cluster.zone}/${cluster.id}/overview`
}
