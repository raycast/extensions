import { Action, ActionPanel, Color, Icon } from '@raycast/api'
import { Todo } from '@/types/todo'
import { Tag } from '@/types/tag'

type SetLabelActionProps = {
  todo: Todo
  tags: Tag[]
  onSetLabel: (todo: Todo, tag: Tag | null) => void
}

export function SetLabelAction({
  todo,
  tags,
  onSetLabel,
}: SetLabelActionProps) {
  return (
    <ActionPanel.Submenu
      title="Set Label"
      icon={{
        source: 'label.png',
        tintColor: Color.PrimaryText,
      }}
      shortcut={{ modifiers: ['cmd'], key: 'l' }}
    >
      {tags.map((tag) => (
        <Action
          key={tag.id}
          icon={{
            source: 'dot.png',
            tintColor: tag.color,
          }}
          title={tag.name}
          onAction={() => onSetLabel(todo, tag)}
        />
      ))}
      <Action.OpenInBrowser title="Create" icon={Icon.Plus} url={todo.url} />
    </ActionPanel.Submenu>
  )
}
