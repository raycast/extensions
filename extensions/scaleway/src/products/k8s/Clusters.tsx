import { List } from '@raycast/api'
import { getPreferenceUser } from 'helpers/getPreferenceUser'
import { useReducer } from 'react'
import { POLLING_INTERVAL } from '../../constants'
import { ClusterAction } from './ClusterAction'
import { ClusterDetail } from './ClusterDetail'
import { useAllRegionClustersQuery } from './queries'
import { getClusterStatusIcon, isClusterTransient } from './status'

export const Clusters = () => {
  const clientSetting = getPreferenceUser()
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, true)

  const { data: clusters = [], isLoading } = useAllRegionClustersQuery(
    {
      orderBy: 'created_at_desc',
      organizationId: clientSetting.defaultOrganizationId,
    },
    {
      pollingInterval: POLLING_INTERVAL['10S'],
      needPolling: (data) => (data || []).some(isClusterTransient),
    }
  )

  const isListLoading = isLoading && !clusters

  return (
    <List
      isLoading={isListLoading}
      isShowingDetail={isDetailOpen}
      searchBarPlaceholder="Search Clusters …"
    >
      {clusters.map((cluster) => (
        <List.Item
          key={cluster.id}
          title={cluster.name}
          icon={{
            source: {
              dark: 'icons/k8s-kapsule@dark.svg',
              light: 'icons/k8s-kapsule@light.svg',
            },
          }}
          detail={<ClusterDetail cluster={cluster} />}
          accessories={[
            {
              tooltip: cluster.status,
              icon: getClusterStatusIcon(cluster),
            },
          ]}
          actions={<ClusterAction cluster={cluster} toggleIsDetailOpen={toggleIsDetailOpen} />}
        />
      ))}

      <List.EmptyView title="No Clusters found" />
    </List>
  )
}
