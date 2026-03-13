import {Action, ActionPanel, List} from "@raycast/api"
import {Checklist, Task} from "api/types"
import {colorForTailwind} from "helpers/colors"
import {iconForDifficulty} from "helpers/focustask"
import {FC} from "react"

export const TaskListItem: FC<{task: Task; lists: Checklist[]}> = ({
  task,
  lists,
}) => {
  const icon = iconForDifficulty(task.difficulty)
  const list = lists.find((list) => list.id === task.listId)
  const color = list?.colorClassName
    ? colorForTailwind(list?.colorClassName)
    : undefined

  return (
    <List.Item
      title={formatTitle(task)}
      subtitle={task.note ?? undefined}
      keywords={[]}
      accessories={[
        {
          text: list?.title,
        },
      ]}
      icon={
        icon
          ? {
              source: icon,
              tintColor: color,
            }
          : undefined
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={task.url}
            shortcut={{modifiers: ["cmd"], key: "o"}}
          />
        </ActionPanel>
      }
    />
  )
}

const formatTitle = (task: Task) => {
  if (task.formattedDeferDate) {
    return `${task.title} [${task.formattedDeferDate}]`
  } else {
    return task.title
  }
}
