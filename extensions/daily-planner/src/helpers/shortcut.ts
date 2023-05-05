import { getPreferenceValues, Keyboard } from "@raycast/api";

const { primaryTodoSource } = getPreferenceValues<{ primaryTodoSource: string }>();

type TodoShortcutAction =
  | "startToday"
  | "startTomorrow"
  | "pickStartDate"
  | "pickDueDate"
  | "complete"
  | "cancel"
  | "setPriority"
  | "moveToList"
  | "addTag"
  | "removeTag"
  | "createTodo";

type AppAgnosticTodoAction = "showDetails" | "openInApp" | "editTodo" | "deleteTodo";

type TodoAction = TodoShortcutAction | AppAgnosticTodoAction;

type BlockAction =
  | "blockTime"
  | "addToTaskBlock"
  | "addBreakBlock"
  | "removeFromTaskBlock"
  | "deleteBlock"
  | "moveBlock"
  | "showTaskBlockTodos"
  | "openInCalendar";

type TrackAction = "startTimer" | "stopTimer" | "stopTimerAndCompleteToDo" | "pauseTimer";

const unsupportedAction: Keyboard.Shortcut = { modifiers: ["shift", "ctrl", "opt", "cmd"], key: "»" };

// Keyboard shortcuts used when the to-do list app has no official keyboard shortcut for the action.
const baseShortcuts: Record<TodoShortcutAction, Keyboard.Shortcut> = {
  startToday: { modifiers: ["cmd"], key: "t" },
  startTomorrow: { modifiers: ["opt", "cmd"], key: "t" },
  pickStartDate: { modifiers: ["cmd"], key: "s" },
  pickDueDate: { modifiers: ["shift", "cmd"], key: "d" },
  complete: { modifiers: ["shift", "cmd"], key: "c" },
  cancel: { modifiers: ["opt", "cmd"], key: "k" },
  setPriority: { modifiers: ["shift", "cmd"], key: "p" },
  moveToList: { modifiers: ["shift", "cmd"], key: "m" },
  addTag: { modifiers: ["shift", "cmd"], key: "t" },
  removeTag: { modifiers: ["ctrl"], key: "t" },
  createTodo: { modifiers: ["cmd"], key: "n" },
};

const remindersShortcuts: Record<TodoShortcutAction, Keyboard.Shortcut> = {
  startToday: { modifiers: ["cmd"], key: "t" },
  startTomorrow: { modifiers: ["opt", "cmd"], key: "t" },
  pickStartDate: baseShortcuts.pickStartDate,
  pickDueDate: baseShortcuts.pickDueDate,
  complete: { modifiers: ["shift", "cmd"], key: "c" },
  cancel: unsupportedAction,
  setPriority: baseShortcuts.setPriority,
  moveToList: baseShortcuts.moveToList,
  addTag: { modifiers: ["shift", "cmd"], key: "t" },
  removeTag: baseShortcuts.removeTag,
  createTodo: { modifiers: ["cmd"], key: "n" },
};

const thingsShortcuts: Record<TodoShortcutAction, Keyboard.Shortcut> = {
  startToday: { modifiers: ["cmd"], key: "t" },
  startTomorrow: { modifiers: ["ctrl"], key: "]" }, // Start date +1 day
  pickStartDate: { modifiers: ["cmd"], key: "s" },
  pickDueDate: { modifiers: ["shift", "cmd"], key: "d" },
  complete: { modifiers: ["cmd"], key: "." }, // Command-K conflicts with Raycast Actions
  cancel: { modifiers: ["opt", "cmd"], key: "k" },
  setPriority: unsupportedAction,
  moveToList: { modifiers: ["shift", "cmd"], key: "m" },
  addTag: { modifiers: ["shift", "cmd"], key: "t" }, // Edit tags
  removeTag: { modifiers: ["ctrl"], key: "t" }, // Toggle tag on/off
  createTodo: { modifiers: ["cmd"], key: "n" },
};

// Todoist macOS keyboard shortcuts tend not to have modifiers, but without modifiers, Raycast keyboard shortcuts
// interfere with entering search text. Thus, ["shift", "cmd"] is used for consistency with Raycast Todoist extension.
const todoistShortcuts: Record<TodoShortcutAction, Keyboard.Shortcut> = {
  startToday: baseShortcuts.startToday,
  startTomorrow: baseShortcuts.startTomorrow,
  pickStartDate: unsupportedAction,
  pickDueDate: { modifiers: ["shift", "cmd"], key: "t" },
  complete: { modifiers: ["shift", "cmd"], key: "e" },
  cancel: unsupportedAction,
  setPriority: { modifiers: ["shift", "cmd"], key: "y" },
  moveToList: { modifiers: ["shift", "cmd"], key: "v" },
  addTag: { modifiers: ["shift", "cmd"], key: "l" },
  removeTag: { modifiers: ["ctrl"], key: "l" }, // no official shortcut, but using "l" instead of "t"
  createTodo: { modifiers: ["shift", "cmd"], key: "a" },
};

const shortcutScheme: Record<string, Record<TodoShortcutAction, Keyboard.Shortcut>> = {
  reminders: remindersShortcuts,
  things: thingsShortcuts,
  todoist: todoistShortcuts,
};

const todoActionShortcuts: Record<AppAgnosticTodoAction, Keyboard.Shortcut> = {
  showDetails: { modifiers: ["cmd"], key: "d" },
  openInApp: { modifiers: ["cmd"], key: "o" },
  editTodo: { modifiers: ["cmd"], key: "e" }, // consistent with Todoist
  deleteTodo: { modifiers: ["cmd"], key: "delete" }, // consistent with Todoist (Reminders & Things: "delete")
};

const blockActionShortcuts: Record<BlockAction, Keyboard.Shortcut> = {
  blockTime: { modifiers: ["cmd"], key: "b" },
  addToTaskBlock: { modifiers: ["shift", "cmd"], key: "b" },
  removeFromTaskBlock: { modifiers: ["shift", "cmd"], key: "b" },
  addBreakBlock: { modifiers: ["opt", "cmd"], key: "b" },
  deleteBlock: { modifiers: ["ctrl"], key: "x" }, // Shift-Command-D conflicts with pickDueDate
  moveBlock: { modifiers: ["shift", "cmd"], key: "r" }, // Shift-Command-M conflicts with moveToList
  showTaskBlockTodos: { modifiers: ["cmd"], key: "d" }, // same as "Show Details"
  openInCalendar: { modifiers: ["shift", "cmd"], key: "o" },
};

const trackActionShortcuts: Record<TrackAction, Keyboard.Shortcut> = {
  startTimer: { modifiers: ["shift", "cmd"], key: "s" },
  stopTimer: { modifiers: ["shift", "cmd"], key: "s" },
  stopTimerAndCompleteToDo: { modifiers: ["shift", "cmd"], key: "d" },
  pauseTimer: { modifiers: ["shift", "cmd"], key: "p" }, // conflicts with "setPriority", but these two commands never appear together.
};

export const shortcut: Record<TodoAction | BlockAction | TrackAction, Keyboard.Shortcut> = {
  ...shortcutScheme[primaryTodoSource],
  ...todoActionShortcuts,
  ...blockActionShortcuts,
  ...trackActionShortcuts,
};
