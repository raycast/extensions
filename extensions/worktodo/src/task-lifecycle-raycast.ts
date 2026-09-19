import { Icon, type Keyboard } from "@raycast/api";
import type {
  TaskLifecycleHistoryDirection,
  TaskLifecycleHistoryState,
  TaskLifecycleMutationKind,
} from "./shared/application/task-lifecycle-interaction";
import { taskLifecycleHistoryTitle, taskLifecycleMutationPresentation } from "./shared/presentation/task-lifecycle";

const HISTORY_SHORTCUTS: Record<TaskLifecycleHistoryDirection, Keyboard.Shortcut> = {
  undo: { modifiers: ["cmd"], key: "z" },
  redo: { modifiers: ["cmd", "shift"], key: "z" },
};

export function taskLifecycleHistoryActionPresentation(state: TaskLifecycleHistoryState) {
  return {
    title: taskLifecycleHistoryTitle(state),
    icon: state.direction === "undo" ? Icon.Undo : Icon.Redo,
    shortcut: HISTORY_SHORTCUTS[state.direction],
  };
}

export function taskLifecycleMutationActionPresentation(operation: TaskLifecycleMutationKind) {
  return {
    ...taskLifecycleMutationPresentation(operation),
    icon:
      operation === "restore"
        ? Icon.ArrowCounterClockwise
        : operation === "reopen"
          ? Icon.Circle
          : operation === "trash"
            ? Icon.Trash
            : Icon.CheckCircle,
  };
}
