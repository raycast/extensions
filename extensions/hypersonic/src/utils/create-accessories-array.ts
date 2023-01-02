import { Filter } from '@/types/filter'
import { Project } from '@/types/project'
import { Todo } from '@/types/todo'
import { Color, Image } from '@raycast/api'
import { getAvatarIcon } from '@raycast/utils'
import { format } from 'date-fns'

export function createAccessoriesArray({
  todo,
  projectsById,
  filter,
}: {
  todo: Partial<Todo>
  projectsById: Record<string, Project>
  filter?: Filter
}) {
  const accessories = []

  if (todo.date) {
    const icon =
      todo.date < new Date()
        ? {
            icon: {
              source: 'calendar-cross.svg',
              tintColor: Color.Red,
            },
          }
        : {}
    accessories.push({
      ...icon,
      text: format(todo.date, 'd MMM'),
      tooltip: format(todo.date, "EEEE d MMMM yyyy 'at' HH:mm"),
    })
  }

  if (todo.tag && !filter?.tag) {
    accessories.push({
      text: todo.tag?.name,
      icon: {
        source: 'dot.png',
        tintColor: todo.tag.color,
      },
    })
  }

  if (todo.projectId && !filter?.projectId) {
    const project = projectsById[todo.projectId]
    if (project) {
      accessories.push({
        text: project.title,
        icon: {
          source: project.icon ? project.icon : getAvatarIcon(project.title),
        },
      })
    }
  }

  if (todo.user && !filter?.user) {
    accessories.push({
      icon: {
        source: todo.user.icon
          ? encodeURI(todo.user.icon)
          : getAvatarIcon(todo.user.name),
        mask: Image.Mask.Circle,
      },
      tooltip: todo.user.name,
    })
  }

  return accessories
}
