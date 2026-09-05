import { Clipboard, LaunchProps, Toast, open, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getTaskUrl, quickAddTask } from "./api";
import { refreshMenuBar } from "./hooks/useData";

export default async function QuickAddTask(props: LaunchProps<{ arguments: Arguments.QuickAddTask }>) {
  const text = props.arguments.text?.trim() || props.fallbackText?.trim();
  if (!text) {
    await showToast({ style: Toast.Style.Failure, title: "No task text provided" });
    return;
  }

  await showToast({ style: Toast.Style.Animated, title: "Adding task" });

  try {
    const task = await quickAddTask(text);
    await refreshMenuBar();

    const toast = await showToast({
      style: Toast.Style.Success,
      title: "Added task",
      message: task.content,
    });
    toast.primaryAction = {
      title: "Open in OpenTask",
      shortcut: { modifiers: ["cmd", "shift"], key: "o" },
      onAction: () => open(getTaskUrl(task.id)),
    };
    toast.secondaryAction = {
      title: "Copy Task URL",
      shortcut: { modifiers: ["cmd", "shift"], key: "c" },
      onAction: () => Clipboard.copy(getTaskUrl(task.id)),
    };
  } catch (error) {
    await showFailureToast(error, { title: "Unable to add task" });
  }
}
