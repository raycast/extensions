import React from 'react'
import { Form, Icon } from '@raycast/api'
import { useUsers } from '../hooks/user'
import { pictureWithCircle } from '../utils/icon'
import type { ConfigUser } from '../utils/config'

export const UserSelect: React.FC<
  { onChange?: (user: ConfigUser | undefined) => void } & Omit<
    Partial<Form.Dropdown.Props>,
    'onChange'
  >
> = ({ onChange, ...props }) => {
  const { users, findUser } = useUsers()

  const handleChange = (userId: string) => {
    if (!onChange) return
    const user = findUser(userId)
    onChange(user)
  }

  return (
    <Form.Dropdown id="userId" title="用户" onChange={handleChange} {...props}>
      {users.map((user) => (
        <Form.Dropdown.Item
          icon={pictureWithCircle(user.avatarImage || Icon.Person)}
          key={user.userId}
          title={user.screenName}
          value={user.userId}
        />
      ))}
    </Form.Dropdown>
  )
}
