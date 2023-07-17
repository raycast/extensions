import { Action, Icon } from '@raycast/api'
import { Todo } from '@/types/todo'

type CopyToDoActionProps = {
  todo: Todo
}

export function CopyToDoAction({ todo }: CopyToDoActionProps) {
  return (
    <Action.CopyToClipboard
      icon={Icon.Clipboard}
      title="Copy Task Title"
      content={todo.title}
      shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
    />
  )
}
