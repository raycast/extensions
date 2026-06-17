import { Action, ActionPanel, Color, Icon, Image } from '@raycast/api'
import { Todo } from '@/types/todo'
import { User } from '@/types/user'
import { getAvatarIcon } from '@raycast/utils'

type SetLabelActionProps = {
  todo: Todo
  users: User[]
  onSetUser: (todo: Todo, user: User | null) => void
}

export function SetUserAction({ todo, users, onSetUser }: SetLabelActionProps) {
  return (
    <ActionPanel.Submenu
      title="Assign To"
      icon={{
        source: Icon.AddPerson,
        tintColor: Color.PrimaryText,
      }}
      shortcut={{ modifiers: ['cmd'], key: 'u' }}
    >
      {users.map((user) => (
        <Action
          key={user.id}
          autoFocus={user.id === todo.user?.id}
          icon={{
            source: user.icon || getAvatarIcon(user.name),
            mask: Image.Mask.Circle,
          }}
          title={user.name}
          onAction={() => onSetUser(todo, user)}
        />
      ))}
    </ActionPanel.Submenu>
  )
}
