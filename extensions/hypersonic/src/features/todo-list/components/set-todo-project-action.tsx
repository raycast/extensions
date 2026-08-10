import { Action, ActionPanel, Color, Icon } from '@raycast/api'
import { Todo } from '@/types/todo'
import { Project } from '@/types/project'
import { getAvatarIcon } from '@raycast/utils'

type SetLabelActionProps = {
  todo: Todo
  projects: Project[]
  onSetProject: (todo: Todo, project: Project | null) => void
}

export function SetProjectAction({
  todo,
  projects,
  onSetProject,
}: SetLabelActionProps) {
  return (
    <ActionPanel.Submenu
      title="Add Project"
      icon={{
        source: Icon.Hashtag,
        tintColor: Color.PrimaryText,
      }}
      shortcut={{ modifiers: ['cmd'], key: 'p' }}
    >
      {projects.map((project) => (
        <Action
          key={project.id}
          autoFocus={project.id === todo.projectId}
          icon={{
            source: project.icon || getAvatarIcon(project.title),
          }}
          title={project.title}
          onAction={() => onSetProject(todo, project)}
        />
      ))}
    </ActionPanel.Submenu>
  )
}
