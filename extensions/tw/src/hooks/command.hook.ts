import { useAlerts } from "./alert.hook";
import { Task } from "../core/types/task.model";
import { ActionTag, ActionCommands } from "../core/types/task-cli.type";
import { Attribute, TaskCommandProps, isActionTag } from "../core/types";
import { buildTaskCommand, runTaskCommand } from "../core/helpers/cmd.helper";
import { TaskDecorator } from "./task.hook";

type CommandProps = TaskCommandProps & {
  confirm?: boolean;
  onOk?: () => void;
};

const execTaskCommand = async (props: CommandProps) => {
  const { compact } = buildTaskCommand(props);
  const { onBefore, onSuccess, onFailure } = useAlerts(compact);

  if (!(await onBefore(props.confirm))) return;

  return await runTaskCommand(props).catch(onFailure).then(onSuccess).finally(props.onOk);
};

export const useCommand = ({ task }: TaskDecorator, revalidate?: () => void) => ({
  actionCommand: (cmd: ActionCommands) =>
    execTaskCommand({
      command: cmd,
      uuid: task.uuid,
      confirm: true,
      onOk: revalidate,
    }),
  modifyCommand: (attribute: Attribute | ActionTag, value = "") =>
    execTaskCommand({
      uuid: task.uuid,
      command: "modify",
      params: isActionTag(attribute) ? attribute : [attribute, value],
      confirm: false,
      onOk: revalidate,
    }),
});

export type UseCommand = ReturnType<typeof useCommand>;
export type ActionCommand = ReturnType<typeof useCommand>["actionCommand"];
export type ModifyCommand = ReturnType<typeof useCommand>["modifyCommand"];
export type SaveCommand = (params: Partial<Task>) => Promise<string | void>;
