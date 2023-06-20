/* eslint-disable @typescript-eslint/no-explicit-any */
import { isDateOverdue } from "../helpers/date.helper";
import {
  ActionTag,
  Annotation,
  Command,
  CustomizableReport,
  HandyAlias,
  HelperCommand,
  Priority,
  SpecialTag,
  Urgency,
  VirtualTag,
  commands,
  customReports,
  handyAliases,
  helperCommands,
  indicators,
  priorities,
  specialTags,
  urgencies,
  virtualTags,
} from "./task-cli.type";
import { Task } from "./task.model";
import {
  ActionProject,
  Actions,
  CommandProps,
  ExportableAction,
  TaskAction,
  actions,
  TaskCommandProps,
  CommandParams,
} from "./task.type";

export const isTask = (value: unknown): value is Task => {
  if (!value || typeof value !== "object") return false;

  return ["description"].some(
    (key) => key in value && typeof (value as any)[key] === "string" && (value as any)[key].length > 0
  );
};

export const isStateActive = (task: unknown | Task): task is "active" =>
  isTask(task) && task.status === "pending" && task.start !== undefined;

export const isStateDone = (task: unknown | Task): task is "done" =>
  isTask(task) && (task.status === "completed" || task.status === "deleted");

export const isStateDeleted = (task: unknown | Task): task is "deleted" => isTask(task) && task.status === "deleted";

export const isStateOverdue = (task: unknown | Task): task is "overdue" =>
  isTask(task) && task?.status !== "completed" && isDateOverdue(task.due);

export const isActionProject = (action?: any): action is ActionProject =>
  action ? action.startsWith(indicators.project) : false;

export const isActionTag = (action?: any): action is ActionTag =>
  action ? action.startsWith(indicators.tag) || action.startsWith("-") : false;

export const isAction = (value?: string): value is TaskAction =>
  actions[value as Actions] !== undefined || isActionTag(value) || isActionProject(value);

export const isCustomizableReport = (value?: string): value is CustomizableReport =>
  customReports[value as CustomizableReport] !== undefined;

export const isCommand = (value?: unknown): value is Command => commands[value as Command] !== undefined;

export const isHelperCommand = (value?: unknown): value is HelperCommand =>
  helperCommands[value as HelperCommand] !== undefined;

export const isExportableAction = (value?: string): value is ExportableAction =>
  isAction(value) && !isHelperCommand(value);

export const isHandyAlias = (value?: unknown): value is HandyAlias => handyAliases[value as HandyAlias] !== undefined;

export const isPriority = (value?: unknown): value is Priority => priorities[value as Priority] !== undefined;

export const isUrgency = (value?: unknown): value is Urgency => urgencies[value as Urgency] !== undefined;

export const isAnnotation = (value?: any): value is Annotation =>
  value !== undefined &&
  "entry" in value &&
  "description" in value &&
  typeof value.entry === "string" &&
  typeof value.description === "string";

export const isVirtualTag = (value?: unknown): value is VirtualTag => virtualTags[value as VirtualTag] !== undefined;

export const isSpecialTag = (value?: unknown): value is SpecialTag => specialTags[value as SpecialTag] !== undefined;

export const isTuple = (value: unknown): value is [string, string] => Array.isArray(value) && value.length === 2; // eslint-disable-line no-magic-numbers

export const isCommandParams = <T>(value?: any): value is CommandParams<T> => {
  if (value === null || value === undefined) return false;

  if (typeof value === "string" && value.trim().length > 0) {
    return true;
  }

  return typeof value === "object" || Array.isArray(value) || isTuple(value);
};

export const isCommandProps = <T>(value?: any): value is CommandProps<T> => {
  if (value === null || value === undefined || typeof value !== "object") return false;

  if ("params" in value && isCommandParams(value.params)) {
    return true;
  }

  if ("uuid" in value && typeof value.uuid === "string" && value.uuid.length > 0) {
    return true;
  }

  return false;
};

export const isTaskCommandProps = <T>(value?: any): value is TaskCommandProps<T> => {
  if (value === null || value === undefined || typeof value !== "object") return false;

  if ("command" in value && isCommand(value.command)) {
    return !("params" in value) || isCommandParams(value);
  }

  return false;
};

export const isCommandAction = (value?: unknown): value is Command => {
  if (value === null || value === undefined || typeof value !== "object") return false;

  if ("command" in value && isCommand(value.command)) {
    return "params" in value && isCommandParams(value);
  }

  return false;
};
