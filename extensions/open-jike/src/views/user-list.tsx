import React, { useEffect, useState } from 'react'
import { ActionPanel, List } from '@raycast/api'
import { useUsers } from '../hooks/user'
import { LoginNewUser } from '../components/actions/user'
import { UserDetail } from './user-detail'

export const UserList: React.FC = () => {
  const { users, reload, ready } = useUsers()
  const [loading, setLoading] = useState(false)

  const refreshList = async () => {
    setLoading(true)
    await reload().finally(() => setLoading(false))
  }

  useEffect(() => {
    setLoading(!ready)
  }, [ready])

  const actions = <LoginNewUser />

  return (
    <List
      isLoading={loading}
      isShowingDetail={users.length > 0}
      navigationTitle="用户列表"
      actions={<ActionPanel>{actions}</ActionPanel>}
    >
      {users.map((user) => (
        <UserDetail
          key={user.userId}
          user={user}
          actions={actions}
          onRefresh={refreshList}
        />
      ))}
    </List>
  )
}
