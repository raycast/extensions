import { Project } from '@/types/project'
import { Tag } from '@/types/tag'
import { User } from '@/types/user'
import { Action, ActionPanel, Color, Icon, Image } from '@raycast/api'
import { getAvatarIcon } from '@raycast/utils'

type SetLabelActionProps = {
  users: User[]
  tags: Tag[]
  projects: Project[]
  onSetFilter: (filter: any, type: string) => void
}

export function SetFilter({
  users,
  tags,
  projects,
  onSetFilter,
}: SetLabelActionProps) {
  return (
    <ActionPanel.Submenu
      title="Filter"
      icon={{
        source: Icon.Filter,
        tintColor: Color.PrimaryText,
      }}
      shortcut={{ modifiers: ['cmd'], key: 'f' }}
    >
      <ActionPanel.Section>
        {users.map((data) => (
          <Action
            key={data.id}
            icon={{
              source: data.icon ? data.icon : getAvatarIcon(data.name),
              mask: Image.Mask.Circle,
            }}
            title={data.name}
            onAction={() => onSetFilter(data, 'user')}
          />
        ))}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {projects.map((data) => (
          <Action
            key={data.id}
            icon={{
              source: data.icon ? data.icon : getAvatarIcon(data.title),
            }}
            title={data.title}
            onAction={() => onSetFilter(data.id, 'project')}
          />
        ))}
      </ActionPanel.Section>
      {tags.map((data) => (
        <Action
          key={data.id}
          icon={{
            source: 'dot.png',
            tintColor: data.color,
          }}
          title={data.name}
          onAction={() => onSetFilter(data, 'tag')}
        />
      ))}
    </ActionPanel.Submenu>
  )
}
