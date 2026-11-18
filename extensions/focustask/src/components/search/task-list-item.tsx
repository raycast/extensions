import {Action, ActionPanel, List} from "@raycast/api"
import {Checklist, Task} from "../../api/types"
import {colorForTailwind} from "../../helpers/colors"
import {iconForDifficulty} from "../../helpers/focustask"
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
              tintColor:
                typeof color === "string"
                  ? color
                  : color?.dark === undefined || color?.light === undefined
                    ? null
                    : {dark: color.dark, light: color.light},
            }
          : undefined
      }
      detail={
        <List.Item.Detail
          markdown={task.note}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Title"
                text={task.title}
              />
              <List.Item.Detail.Metadata.TagList title="Status">
                <List.Item.Detail.Metadata.TagList.Item text={task.status} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="Column">
                <List.Item.Detail.Metadata.TagList.Item text={task.column} />
              </List.Item.Detail.Metadata.TagList>
            </List.Item.Detail.Metadata>
          }
        />
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
