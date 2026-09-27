import type { TaskLifecycleHistoryState, TaskLifecycleMutationKind } from "../application/task-lifecycle-interaction";

export type TaskLifecycleMutationPresentation = {
  title: "Complete Task" | "Reopen Task" | "Move to Trash" | "Restore Task";
  successTitle: "Task completed" | "Task reopened" | "Task moved to trash" | "Task restored";
  failureTitle:
    "Unable to complete task" | "Unable to reopen task" | "Unable to move task to trash" | "Unable to restore task";
};

export function taskLifecycleMutationPresentation(
  operation: TaskLifecycleMutationKind,
): TaskLifecycleMutationPresentation {
  switch (operation) {
    case "complete":
      return { title: "Complete Task", successTitle: "Task completed", failureTitle: "Unable to complete task" };
    case "reopen":
      return { title: "Reopen Task", successTitle: "Task reopened", failureTitle: "Unable to reopen task" };
    case "trash":
      return {
        title: "Move to Trash",
        successTitle: "Task moved to trash",
        failureTitle: "Unable to move task to trash",
      };
    case "restore":
      return { title: "Restore Task", successTitle: "Task restored", failureTitle: "Unable to restore task" };
  }
}

export function taskLifecycleHistoryTitle(
  state: TaskLifecycleHistoryState,
): "Undo Completion" | "Redo Completion" | "Undo Move to Trash" | "Redo Move to Trash" {
  if (state.kind === "complete") {
    return state.direction === "undo" ? "Undo Completion" : "Redo Completion";
  }
  return state.direction === "undo" ? "Undo Move to Trash" : "Redo Move to Trash";
}
