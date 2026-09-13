import type { ReactElement } from "react";

import type { CommandRuntimeBootstrap } from "../application/commandRuntime";
import { TaskListView } from "../components/TaskListView";
import { useCommandRuntime } from "../hooks/useCommandRuntime";
import type { TaskCommandConfig } from "./taskCommandConfigs";
import { projectTaskListCommandRuntime, type TaskListCommandRuntimeOptions } from "./taskListCommandRuntime";

export type TaskListCommandShellProps = Readonly<{
  bootstrap: CommandRuntimeBootstrap;
  contextKey: string;
  config: TaskCommandConfig;
  options: TaskListCommandRuntimeOptions;
}>;

export function TaskListCommandShell(props: TaskListCommandShellProps): ReactElement {
  const state = useCommandRuntime(props.bootstrap, props.contextKey);
  const projected = projectTaskListCommandRuntime(state, props.options);

  return <TaskListView config={props.config} runtime={projected} />;
}

export default TaskListCommandShell;
