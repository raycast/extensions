export const statuses = {
  pending: "Task that has not yet been completed or deleted",
  deleted: "Task that has been removed from the pending state",
  completed: "Task that has been removed from the pending state by completion",
  waiting: "A Pending Task that has been hidden from typical view",
  recurring: "A parent template Task from which child tasks are cloned",
} as const;
export type Statuses = typeof statuses;
export type Status = keyof Statuses;

export const states = {
  scheduled: "The task is scheduled and has a scheduled date",
  ready: "The task is pending, not blocked, and either not scheduled, or scheduled before now",
  active: "The task is started and has a start date",
  overdue: "The task is past its due date",
  blocked: "The task is dependent on another incomplete task",
  blocking: "Another task depends on this incomplete task",
  completed: "The task is completed",
  done: "The task is completed, deleted or has an end date",
  deleted: "The task has been deleted",
} as const;
export type States = typeof states;
export type State = keyof States;

export const situations = {
  ...statuses,
  ...states,
};
export type Situations = typeof situations;
export type Situation = keyof Situations;

export const customReports = {
  active: "Started tasks",
  all: "Pending, completed and deleted tasks",
  blocked: "Tasks that are blocked by other tasks",
  blocking: "Tasks that block other tasks",
  completed: "Tasks that have been completed",
  list: "Pending tasks",
  long: "Pending tasks, long form",
  ls: "Pending tasks, short form",
  minimal: "Pending tasks, minimal form",
  newest: "Most recent pending tasks",
  next: "Most urgent tasks",
  oldest: "Oldest pending tasks",
  overdue: "Overdue tasks",
  ready: "Pending, unblocked, scheduled tasks",
  recurring: "Pending recurring tasks",
  unblocked: "Tasks that are not blocked",
  waiting: "Hidden, waiting tasks",
} as const;
export type CustomizableReports = typeof customReports;
export type CustomizableReport = keyof CustomizableReports;

export type ViewReport = Extract<
  CustomizableReport,
  "all" | "next" | "active" | "overdue" | "blocked" | "blocking" | "completed"
>;

/**
 * TaskWarrior commands
 *
 * @see https://taskwarrior.org/docs/commands.html
 */
export const commands = {
  add: "Add a new task",
  delete: "Mark a task as deleted",
  done: "Complete a task",
  modify: "Modify one or more tasks",
  purge: "Completely removes tasks, rather than change status to deleted (2.6.0)",
  start: "Start working on a task, make active",
  stop: "Stop working on a task, no longer active",
  undo: "Revert last change",
  // synchronize: "Syncs tasks with Taskserver",
  // annotate: "Add an annotation to a task",
  // append: "Append words to a task description",
  // calc: "Expression calculator (2.4.0)",
  // config: "Modify configuration settings",
  // context: "Manage contexts",
  // count: "Count the tasks matching a filter",
  // denotate: "Remove an annotation from a task",
  // duplicate: "Clone an existing task",
  // edit: "Launch your text editor to modify a task",
  // execute: "Execute an external command",
  // export: "Export tasks in JSON format",
  // help: "Show high-level help, a cheat-sheet",
  // import: "Import tasks in JSON form",
  // log: "Record an already-completed task",
  // logo: "Show the Taskwarrior logo",
  // prepend: "Prepend words to a task description",
} as const;
export type Commands = typeof commands;
export type Command = keyof Commands;

export const indicators = {
  tag: "+",
  project: "@",
} as const;
export type Indicators = typeof indicators;

export type Indicator = {
  [K in keyof Indicators]: `${Indicators[K]}${string}`;
};

export type ActionTag = `+${string}` | `-${string}`;

export const handyAliases = {
  undone: "Mark a task as pending",
} as const;
export type HandyAliases = typeof handyAliases;
export type HandyAlias = keyof HandyAliases;

export type ActionCommands =
  | Extract<Command, "done" | "start" | "stop" | "delete" | "purge">
  | Extract<HandyAlias, "undone">;

/**
 * Possible commands for each state
 */
export const stateCommands: Record<Situation, ActionCommands[]> = {
  active: ["done", "delete", "stop"],
  done: ["undone", "delete"],
  deleted: ["purge"],
  overdue: ["done", "delete", "start"],
  scheduled: ["done", "delete", "start"],
  ready: ["done", "delete", "start"],
  blocked: ["done", "delete", "start"],
  blocking: ["done", "delete", "start"],
  completed: ["undone", "delete"],
  pending: ["done", "delete", "start"],
  waiting: ["done", "delete", "start"],
  recurring: ["done", "delete", "start"],
};

export const helperCommands = {
  _aliases: "List of active aliases",
  _columns: "List of supported columns",
  _commands: "List of supported commands",
  _config: "List of configuration setting names",
  _context: "List of defined context names",
  _get: "DOM accessor",
  _ids: "Filtered list of task IDs",
  _projects: "Filtered list of project names",
  _show: "List of name=value configuration settings",
  _tags: "Filtered list of tags in use",
  _udas: "List of configured UDA names",
  _unique: "2.5.0 List of unique values for the specified attribute",
  _urgency: "Filtered list of task urgencies",
  _uuids: "Filtered list of pending UUIDs",
  _version: "Task version (and optional git commit)",
  _zshattributes: "Zsh formatted task attribute list",
  _zshcommands: "Zsh formatted command list",
  _zshids: "Zsh formatted ID list",
  _zshuuids: "Zsh formatted UUID list",
} as const;
export type HelperCommands = typeof helperCommands;
export type HelperCommand = keyof HelperCommands;

export const priorities = {
  H: "High priority",
  M: "Medium priority",
  L: "Low priority",
};
export type Priorities = typeof priorities;
export type Priority = keyof Priorities;

export const urgencies = {
  H: "High urgency",
  M: "Medium urgency",
  L: "Low urgency",
};
export type Urgencies = typeof urgencies;
export type Urgency = keyof Urgencies;

/**
 * Annotation has an "entry" field and a "description" field
 * @example { entry: '20210101T000000Z', description: 'Buy spaceship' }
 */
export type Annotation = {
  /**
   * Date annotation was created
   * @example YYYYMMDDTHHMMSSZ
   */
  entry: string;

  /**
   * Annotation description text
   * @example Buy spaceship
   */
  description: string;
};

export const virtualTags = {
  INSTANCE: "Is the task a recurring instance?",
  TEMPLATE: "Is the task a recurring template?",
  ACTIVE: "Is the task active, i.e. does it have a start date?",
  ANNOTATED: "Does the task have any annotations?",
  BLOCKED: "Is the task dependent on another incomplete task?",
  BLOCKING: "Does another task depend on this incomplete task?",
  CHILD: "Is the task a recurring child task?",
  COMPLETED: "Is the task in the completed state? 2.4.0",
  DELETED: "Is the task in the deleted state? 2.4.0",
  DUE: "Is this task due within 7 days? Determined by rc.due",
  DUETODAY: "Is this task due sometime today?",
  LATEST: "Is the task the most recently added task? 2.5.0",
  MONTH: "Is this task due this month? 2.3.0",
  ORPHAN: "Does the task contain any orphaned UDA values? 2.5.0",
  OVERDUE: "Is this task past its due date?",
  PARENT: "Is the task a hidden parent recurring task? 2.3.0",
  PENDING: "Is the task in the pending state? 2.4.0",
  PRIORITY: "Does the task have a priority? 2.5.0",
  PROJECT: "Does the task have a project? 2.5.0",
  QUARTER: "Is this task due this quarter? 2.6.0",
  READY: "Is the task pending, not blocked, and either not scheduled, or scheduled before now. 2.4.0",
  SCHEDULED: "Is the task scheduled, i.e. does it have a scheduled date?",
  TAGGED: "Does the task have any tags?",
  TODAY: "Is this task due sometime today?",
  TOMORROW: "Is the task due tomorrow? 2.4.0",
  UDA: "Does the task contain any UDA values? 2.5.0",
  UNBLOCKED: "The opposite of BLOCKED, for convenience. Note +BLOCKED == -UNBLOCKED and vice versa.",
  UNTIL: "Does the task expire, i.e. does it have an until date?",
  WAITING: "Is the task hidden, i.e. does it have a wait date?",
  WEEK: "Is this task due this week? 2.3.0",
  YEAR: "Is this task due this year? 2.3.0",
  YESTERDAY: "Was the task due yesterday? 2.4.0",
};
export type VirtualTags = typeof virtualTags;
export type VirtualTag = keyof VirtualTags;

export const specialTags = {
  nocolor: "Disable color rules processing for this task",
  nonag: "Completion of this task suppresses all nag messages",
  nocal: "This task will not appear on the calendar",
};
export type SpecialTags = typeof specialTags;
export type SpecialTag = keyof SpecialTags;

export type UUID = string;
