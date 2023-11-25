import {MenuBarExtra} from "@raycast/api"
import {Task} from "api/types"
import {FC, useCallback} from "react"
import {openTask, raycastIconFromTask} from "../../helpers/focustask"

export const TaskItem: FC<{task: Task}> = ({task}) => {
  return (
    <MenuBarExtra.Item
      title={task.title}
      icon={raycastIconFromTask(task)}
      onAction={() => openTask(task)}
    />
  )
}
