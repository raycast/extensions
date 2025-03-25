import { Action, Icon } from '@raycast/api'
import { Todo } from '@/types/todo'

type CopyToDoActionProps = {
  todo: Todo
}

export function CopyTaskLinkAction({ todo }: CopyToDoActionProps) {
  return (
    <Action.CopyToClipboard
      icon={Icon.Clipboard}
      title="Copy Task URL"
      content={{
        text: todo.shareUrl,
        html: `<a href="${todo.shareUrl}">${todo.title}</a>`,
      }}
      shortcut={{ modifiers: ['cmd', 'shift'], key: 's' }}
    />
  )
}
