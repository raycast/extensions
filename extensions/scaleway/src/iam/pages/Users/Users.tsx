import { Color, Icon, List } from '@raycast/api'
import { useReducer } from 'react'
import { useAllUsersQuery } from '../../queries'
import { User } from './User'
import { UserAction } from './UserAction'

export const Users = () => {
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, false)

  const { data: users = [], isLoading } = useAllUsersQuery({
    orderBy: 'created_at_desc',
  })

  const isListLoading = isLoading && !users

  return (
    <List
      isLoading={isListLoading}
      isShowingDetail={isDetailOpen}
      searchBarPlaceholder="Search Users …"
    >
      {users.map((user) => (
        <List.Item
          key={user.id}
          title={user.email}
          subtitle={user.type}
          icon={{
            source: {
              dark: 'iam-user@dark.svg',
              light: 'iam-user@light.svg',
            },
          }}
          accessories={[
            {
              text: '2FA',
              icon: user.mfa
                ? {
                    source: Icon.Checkmark,
                    tintColor: Color.Green,
                  }
                : { source: Icon.XMarkCircleFilled, tintColor: Color.Red },
            },
          ]}
          detail={<User user={user} />}
          actions={<UserAction user={user} toggleIsDetailOpen={toggleIsDetailOpen} />}
        />
      ))}

      <List.EmptyView title="No Users found" />
    </List>
  )
}
