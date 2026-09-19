import type { ReactElement } from "react";

import type { CommandRuntimeBootstrap } from "../application/commandRuntime";
import CreateTaskCommand from "../components/CreateTaskCommand";
import { useCommandRuntime } from "../hooks/useCommandRuntime";
import { useCreateTaskCommandRuntime } from "../hooks/useCreateTaskCommandRuntime";
import type { CreateTaskCommandRuntimeDependencies } from "./createTaskCommandRuntime";

export type CreateTaskCommandShellProps = Readonly<{
  bootstrap: CommandRuntimeBootstrap;
  contextKey: string;
  dependencies: CreateTaskCommandRuntimeDependencies;
}>;

export function CreateTaskCommandShell(props: CreateTaskCommandShellProps): ReactElement {
  const commandRuntime = useCommandRuntime(props.bootstrap, props.contextKey);
  const createTaskRuntime = useCreateTaskCommandRuntime(commandRuntime, props.dependencies);
  return <CreateTaskCommand runtime={createTaskRuntime} />;
}
