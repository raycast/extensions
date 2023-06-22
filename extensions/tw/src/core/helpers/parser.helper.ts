import {
  isVirtualTag,
  isSpecialTag,
  isExportableAction,
  isActionProject,
  isCommand,
  isCustomizableReport,
  isHandyAlias,
  isTuple,
  isHelperCommand,
  isActionTag,
} from "../types/task.guard";
import { Task } from "../types/task.model";
import { TaskAction, TaskCommandProps } from "../types/task.type";

export const parseJSON = (data?: string) => JSON.parse(data ?? "[]") as Task[];

export const parseStringLines = (data?: string) =>
  (data ?? "")
    .split("\n")
    .filter((line) => line && line.trim()?.length > 0 && !isVirtualTag(line) && !isSpecialTag(line));

export const getParser = (command: TaskAction) => (isExportableAction(command) ? parseJSON : parseStringLines);

/**
 * Build a task add command
 * @example `task add description:"Setup"`
 * @example `task add description:"Setup" +raycast`
 * @example `task add description:"Setup" +raycast +exts`
 * @example `task add description:"Setup" +raycast +exts project:tw`
 * @example `task add description:"Setup" +raycast +exts project:tw priority:H`
 * @example `task add description:"Setup" +raycast +exts project:tw priority:H due:today`
 */
export const buildCommand = (params: Partial<Task> | undefined) =>
  Object.entries(params ?? {}).reduce((acc, [key, value]) => {
    if (key === "tags") {
      if (typeof value === "string") value = [value];
      if (Array.isArray(value)) {
        return [
          ...acc,
          ...value.filter((tag) => typeof tag === "string" && tag.length > 0).map((tag) => `+${tag.toString().trim()}`),
        ];
      }
    } else if (key === "due") {
      if (value) {
        if (typeof value === "string" && value.length > 0) {
          return [...acc, `${key}:"${value.trim()}"`];
        } else if (value instanceof Date) {
          return [...acc, `${key}:"${value.toISOString()}"`];
        }
      }
    } else if (value && typeof value === "string" && value.length > 0) {
      return [...acc, `${key}:"${value.trim()}"`];
    }
    return acc;
  }, [] as string[]);

export const parseTaskCommandArgs = ({ command, uuid, params }: TaskCommandProps<Task>) => {
  if (isHelperCommand(command)) {
    return [command];
  }

  if (isCommand(command)) {
    // task add description:"Setup" +raycast +exts project:env priority:H due:today
    // task eb0eb0e0 modify (+|-)raycast
    // task eb0eb0e0 modify project:(tw|)
    // task eb0eb0e0 modify priority:(L|M|H|)
    // task eb0eb0e0 modify due:(20230221T002231Z|today|tomorrow|friday|)
    if (command === "modify" || command === "add") {
      const res = command === "modify" ? [`${uuid}`] : [];

      if (isActionTag(params)) {
        return [...res, command, `${params}`];
      }

      if (isTuple(params)) {
        const [key, value] = params;
        return [...res, command, `${key}:"${value}"`];
      }

      return [...res, command, ...buildCommand(params as Partial<Task>)];
    }

    // task undo
    if (command === "undo") {
      return [command];
    }

    // task (delete|done|purge|start|stop) eb0eb0e0
    return [command, `${uuid}`];
  }

  if (isCustomizableReport(command)) {
    return ["export", command];
  }

  if (isHandyAlias(command)) {
    return [`${uuid}`, "modify", `status:${command}`];
  }

  if (isActionProject(command)) {
    return [`project:${command?.replace(/^@/, "")}`, "export"];
  }

  return [command, "export"];
};
