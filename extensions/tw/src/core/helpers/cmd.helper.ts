import { getPreferenceValues } from "@raycast/api";
import { Task, TaskCommandProps } from "../types/index";
import { parseTaskCommandArgs } from "./parser.helper";
import { execFile } from "child_process";

const command = getPreferenceValues<{ custom_task_path: string }>().custom_task_path ?? "task";

export const buildTaskCommand = (props: TaskCommandProps<Task>) => {
  const args = parseTaskCommandArgs(props);

  return {
    args,
    cmd: command,
    compact: ["task", ...args].join(" "),
  };
};

export const runTaskCommand = (props: TaskCommandProps) =>
  new Promise<string>((resolve, reject) => {
    execFile(command, parseTaskCommandArgs(props), (err, stdout) => (err ? reject(err) : resolve(stdout)));
  });
