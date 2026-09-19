import { launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import type { MyTasksLaunchContext } from "./shared/presentation/task-launch";

export async function launchMyTasks(context: MyTasksLaunchContext): Promise<void> {
  try {
    await launchCommand({ name: "my-tasks", type: LaunchType.UserInitiated, context });
  } catch {
    await showToast(Toast.Style.Failure, "Unable to open All Tasks").catch(() => undefined);
  }
}

export function requestMenuBarRefresh(): void {
  void launchCommand({ name: "menu-bar", type: LaunchType.Background }).catch(() => undefined);
}
