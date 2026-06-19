import type { LaunchProps } from "@raycast/api";
import ConfiguredCommand from "./components/ConfiguredCommand";
import TaskDetailView from "./components/TaskDetailView";
import TaskListScreen from "./components/TaskListScreen";
import { getTaskLogStatusBehavior } from "./lib/config";

interface ListTasksLaunchContext {
  selectedTaskId?: string;
}

export default function Command(props: LaunchProps<{ launchContext?: ListTasksLaunchContext }>) {
  const taskLogStatusBehavior = getTaskLogStatusBehavior();

  return (
    <ConfiguredCommand>
      {(notePath) =>
        props.launchContext?.selectedTaskId ? (
          <TaskDetailView
            notePath={notePath}
            taskId={props.launchContext.selectedTaskId}
            statusBehavior={taskLogStatusBehavior}
          />
        ) : (
          <TaskListScreen notePath={notePath} taskLogStatusBehavior={taskLogStatusBehavior} />
        )
      }
    </ConfiguredCommand>
  );
}
