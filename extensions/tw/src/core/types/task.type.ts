import {
  HelperCommand,
  Indicators,
  commands,
  customReports,
  helperCommands,
  handyAliases,
  ActionTag,
} from "./task-cli.type";

export type ActionProject = `${Indicators["project"]}${string}`;

export const actions = {
  ...commands,
  ...customReports,
  ...helperCommands,
  ...handyAliases,
} as const;
export type Actions = keyof typeof actions;
export type TaskAction = Actions | ActionTag | ActionProject;
export type ExportableAction = Exclude<TaskAction, HelperCommand>;

export type CommandParams<T = unknown> =
  | Partial<T>
  | string
  | ActionTag
  | string[]
  | [string, string]
  | [string, string][];

export type CommandProps<T = unknown> = {
  uuid?: string;
  params?: CommandParams<T>;
};

export type TaskCommandProps<T = unknown> = CommandProps<T> & {
  command: TaskAction;
};
