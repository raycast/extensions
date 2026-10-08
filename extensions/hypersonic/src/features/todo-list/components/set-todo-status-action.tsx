import { Action, ActionPanel, Color } from '@raycast/api'
import { Todo } from '@/types/todo'
import { Status } from '@/types/status'

type SetStatusActionProps = {
  todo: Todo
  statuses: Status[]
  onSetStatus: (todo: Todo, status: Status) => void
}

export function SetStatusAction({
  todo,
  statuses,
  onSetStatus,
}: SetStatusActionProps) {
  return (
    <ActionPanel.Submenu
      title="Set Status"
      icon={{
        source: 'progress2.svg',
        tintColor: {
          light: Color.SecondaryText,
          dark: Color.PrimaryText,
        },
      }}
    >
      {statuses.map((status) => {
        return (
          <Action
            key={status.id}
            autoFocus={status.id === todo.status?.id}
            icon={{
              source: status.icon ? status.icon : 'pending.png',
              tintColor: status?.color ? status.color : Color.SecondaryText,
            }}
            title={status.name}
            onAction={() => onSetStatus(todo, status)}
          />
        )
      })}
    </ActionPanel.Submenu>
  )
}
