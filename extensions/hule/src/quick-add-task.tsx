import { LaunchProps, LaunchType, Toast, launchCommand, open, showToast } from "@raycast/api";
import { createTask, getBundle, getMe, taskUrl } from "./api/client";
import type { AvailableBundle, List, User } from "./api/types";
import type { CreateTaskLaunch } from "./create-task";
import { writableLists } from "./hooks/useHule";

/**
 * The list Quick Add writes to: your Quick capture list from Hule's User
 * settings — the one list for tasks made outside the app, the same one the
 * Telegram bot writes to (H-1199, H-1129). The API already answers `null` for a
 * list you can no longer create tasks in; the bundle check also catches one that
 * went read-only or archived since.
 */
export function quickCaptureList(bundle: Pick<AvailableBundle, "lists" | "folders">, me: User): List | undefined {
  const id = me.quickCaptureListId;
  return id ? writableLists(bundle).find((list) => list.id === id) : undefined;
}

export default async function Command(props: LaunchProps<{ arguments: { title: string } }>) {
  const title = props.arguments.title.trim();
  if (!title) {
    await showToast({ style: Toast.Style.Failure, title: "A task needs a title" });
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Creating task" });
  try {
    const [bundle, me] = await Promise.all([getBundle(), getMe()]);
    const list = quickCaptureList(bundle, me);

    // No Quick capture list: the Telegram bot's way round — pick the list for
    // this one task. A no-view command cannot draw a choice, so Create Task
    // opens with the title already in it and the Inbox lists on top.
    if (!list) {
      await toast.hide();
      const context: CreateTaskLaunch = { title, noQuickCapture: true };
      await launchCommand({ name: "create-task", type: LaunchType.UserInitiated, context });
      return;
    }

    const task = await createTask(list.id, { title });
    toast.style = Toast.Style.Success;
    toast.title = `Added to ${list.name}`;
    toast.message = task.title;
    toast.primaryAction = { title: "Open in Hule", onAction: () => open(taskUrl(task)) };
  } catch (cause) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not create the task";
    toast.message = cause instanceof Error ? cause.message : String(cause);
  }
}
