import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { completeTask } from "../api/complete.task";
import { deleteTask } from "../api/delete-task";
import { cleanupPerspective } from "../api/cleanup";

export function useTaskActions(onTaskUpdated?: () => Promise<void>) {
  async function actionDelete(id: string) {
    try {
      await deleteTask(id);
      await showToast({
        title: "Task deleted!",
        style: Toast.Style.Success,
      });
      await onTaskUpdated?.();
    } catch {
      await showFailureToast("An error occurred while deleting the task.");
    }
  }

  async function actionComplete(id: string) {
    try {
      await completeTask(id);
      await showToast({
        title: "Task completed!",
        style: Toast.Style.Success,
      });
      await onTaskUpdated?.();
    } catch {
      await showFailureToast("An error occurred while completing the task.");
    }
  }

  async function actionCleanup() {
    try {
      await cleanupPerspective();
      await showToast({
        title: "Perspective cleaned up!",
        style: Toast.Style.Success,
      });
      await onTaskUpdated?.();
    } catch {
      await showFailureToast("An error occurred while cleaning up the perspective.");
    }
  }

  return {
    actionDelete,
    actionComplete,
    actionCleanup,
  };
}
