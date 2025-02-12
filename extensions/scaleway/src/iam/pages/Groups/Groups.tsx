import { Action, ActionPanel, List } from '@raycast/api'
import type { IAM } from '@scaleway/sdk'
import { useReducer } from 'react'
import { useAllGroupsQuery } from '../../queries'
import { Group } from './Group'

const countMembers = (group: IAM.v1alpha1.Group) =>
  (group.applicationIds.length || 0) + (group.userIds.length || 0)

export const Groups = () => {
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, false)

  const { data: groups = [], isLoading } = useAllGroupsQuery({
    orderBy: 'created_at_desc',
  })

  const isListLoading = isLoading && !groups

  return (
    <List
      isLoading={isListLoading}
      isShowingDetail={isDetailOpen}
      searchBarPlaceholder="Search Groups …"
    >
      {groups.map((group) => (
        <List.Item
          key={group.id}
          title={group.name}
          subtitle={group.description}
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
