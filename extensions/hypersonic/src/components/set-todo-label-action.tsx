import { Action, ActionPanel, Color, Icon } from '@raycast/api'
import { Todo } from '@/types/todo'
import { Tag } from '@/types/tag'

type SetLabelActionProps = {
  todo: Todo
  tags: Tag[]
  onSetLabel: (todo: Todo, tag: Tag | null) => void
  allowCreate?: boolean
}

export function SetLabelAction({
  todo,
  tags,
  onSetLabel,
  allowCreate = false,
}: SetLabelActionProps) {
  return (
    <ActionPanel.Submenu
      title="Add Label"
      icon={{
        source: Icon.Tag,
        tintColor: Color.PrimaryText,
      }}
      shortcut={{ modifiers: ['cmd'], key: 'l' }}
    >
      {tags.map((tag) => (
        <Action
          key={tag.id}
          autoFocus={tag.id === todo.tag?.id}
          icon={{
            source: 'dot.png',
            tintColor: tag.color,
          }}
          title={tag.name}
          onAction={() => onSetLabel(todo, tag)}
        />
      ))}
      {allowCreate && (
        <Action.OpenInBrowser title="Create" icon={Icon.Plus} url={todo.url} />
      )}
    </ActionPanel.Submenu>
  )
}
