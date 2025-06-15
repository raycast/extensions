import { List } from '@raycast/api'
import { getPreferenceUser } from 'helpers/getPreferenceUser'
import { useReducer } from 'react'
import { LoadBalancerAction } from './LoadBalancerAction'
import { LoadBalancerDetail } from './LoadBalancerDetail'
import { useAllZonesLoadBalancersQuery } from './queries'
import { getLoadBalancerStatusIcon } from './status'

export const LoadBalancers = () => {
  const clientSetting = getPreferenceUser()
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, true)

  const { data: loadBalancers = [], isLoading } = useAllZonesLoadBalancersQuery({
    orderBy: 'created_at_desc',
    organizationId: clientSetting.defaultOrganizationId,
  })

  const isListLoading = isLoading && !loadBalancers

  return (
    <List
      isLoading={isListLoading}
      isShowingDetail={isDetailOpen}
      searchBarPlaceholder="Search Load Balancers …"
    >
      {loadBalancers.map((loadBalancer) => (
        <List.Item
          key={loadBalancer.id}
          title={loadBalancer.name}
          icon={{
            source: {
              dark: 'icons/load-balancers@dark.svg',
              light: 'icons/load-balancers@light.svg',
            },
          }}
          detail={<LoadBalancerDetail loadBalancer={loadBalancer} />}
          accessories={[
            {
              tooltip: loadBalancer.status,
              icon: getLoadBalancerStatusIcon(loadBalancer),
            },
          ]}
          actions={
            <LoadBalancerAction
              loadBalancer={loadBalancer}
              toggleIsDetailOpen={toggleIsDetailOpen}
            />
          }
        />
      ))}

      <List.EmptyView title="No Load Balancers found" />
    </List>
  )
}
