import { List } from '@raycast/api'
import { getPreferenceUser } from 'helpers/getPreferenceUser'
import { useReducer } from 'react'
import { InstanceAction } from './InstanceAction'
import { InstanceDetail } from './InstanceDetail'
import { useAllRegionInstancesQuery } from './queries'
import { getInstanceStatusIcon } from './status'

export const Instances = () => {
  const clientSetting = getPreferenceUser()
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, true)

  const { data: instances = [], isLoading } = useAllRegionInstancesQuery({
    orderBy: 'created_at_desc',
    organizationId: clientSetting.defaultOrganizationId,
  })

  const isListLoading = isLoading && !instances

  return (
    <List
      isLoading={isListLoading}
      isShowingDetail={isDetailOpen}
      searchBarPlaceholder="Search Instances …"
    >
      {instances.map((instance) => (
        <List.Item
          key={instance.id}
          title={instance.name}
          icon={{
            source: {
              dark: 'icons/managed-database@dark.svg',
              light: 'icons/managed-database@light.svg',
            },
          }}
          detail={<InstanceDetail instance={instance} />}
          accessories={[
            {
              tooltip: instance.status,
              icon: getInstanceStatusIcon(instance),
            },
          ]}
          actions={<InstanceAction instance={instance} toggleIsDetailOpen={toggleIsDetailOpen} />}
        />
      ))}

      <List.EmptyView title="No Servers found" />
    </List>
  )
}
