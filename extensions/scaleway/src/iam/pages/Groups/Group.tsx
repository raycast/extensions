import { List } from '@raycast/api'
import type { IAM } from '@scaleway/sdk'
import { useAllApplicationsQuery, useAllUsersQuery } from '../../queries'

type GroupProps = {
  group: IAM.v1alpha1.Group
}

export const Group = ({ group }: GroupProps) => {
  const { data: users } = useAllUsersQuery(
    {
      userIds: group.userIds,
    },
    { enabled: group.userIds.length >= 1 }
  )

  const { data: applications } = useAllApplicationsQuery(
    {
      applicationIds: group.applicationIds,
    },
    { enabled: group.applicationIds.length >= 1 }
  )

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={group.name} />
          <List.Item.Detail.Metadata.Label title="Description" text={group.description} />

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Created At"
            text={group.createdAt?.toDateString()}
          />
          <List.Item.Detail.Metadata.Label
            title="Updated At"
            text={group.updatedAt?.toDateString()}
          />

          {applications ? (
            <>
              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.TagList title="Applications">
                {applications.map((application) => (
                  <List.Item.Detail.Metadata.TagList.Item
                    text={application.name}
                    key={application.id}
                  />
                ))}
              </List.Item.Detail.Metadata.TagList>
            </>
          ) : null}

          {users && users.length >= 1 ? (
            <>
              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.TagList title="Users">
                {users.map((user) => (
                  <List.Item.Detail.Metadata.TagList.Item text={user.email} key={user.id} />
                ))}
              </List.Item.Detail.Metadata.TagList>
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  )
}
