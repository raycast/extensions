import { ActionPanel, Action, List, Icon, Color } from '@raycast/api'
import { useAllGroupsQuery } from '../../queries'
import type { IAM } from '@scaleway/sdk'
import { Group } from './Group'
import { useReducer } from 'react'

const countMembers = (group: IAM.v1alpha1.Group) => group?.applicationIds.length + group?.userIds.length

export const Groups = () => {
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, false)

  const { data: groups = [], isLoading } = useAllGroupsQuery({
    orderBy: 'created_at_desc',
  })

  const isListLoading = isLoading && !groups

  return (
    <List isLoading={isListLoading} isShowingDetail={isDetailOpen} searchBarPlaceholder="Search Groups …">
      {groups.map((group) => (
        <List.Item
          key={group.id}
          title={group.name}
          subtitle={group.description}
          // icon={{
          //   tooltip: 'user',
          //   source: {
          //     dark: 'iam-group@dark.svg',
          //     light: 'iam-group@light.svg',
          //   },
          // }}
          detail={<Group group={group} />}
          accessories={[
            {
              text: `Members: ${countMembers(group)}`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action title="More Information" onAction={toggleIsDetailOpen} />
            </ActionPanel>
          }
        />
      ))}

      <List.EmptyView title="No Groups found" />
    </List>
  )
}
