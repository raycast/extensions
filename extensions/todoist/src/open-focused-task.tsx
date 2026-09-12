import { Cache, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";

const cache = new Cache();

const command = async () => {
  const cachedTaskData = cache.get("todoist.focusedTask");
  const focusedTask = cachedTaskData ? JSON.parse(cachedTaskData) : undefined;

  try {
    if (focusedTask) {
      await launchCommand({
        name: "home",
        type: LaunchType.UserInitiated,
        context: { view: `task_${focusedTask.id}` },
      });
    } else {
      await showToast({ style: Toast.Style.Failure, title: "No focused task" });

      await launchCommand({
        name: "home",
        type: LaunchType.UserInitiated,
        context: { view: "inbox" },
      });
    }
  } catch {
    /* empty */
  }
};

export default command;
