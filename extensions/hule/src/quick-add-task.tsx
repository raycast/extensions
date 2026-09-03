import { LaunchProps, Toast, open, showToast } from "@raycast/api";
import { createTask, getBundle, preferences, taskUrl } from "./api/client";
import type { List } from "./api/types";

/**
 * Pick the list Quick Add writes to: the one named in the preferences, matched
 * case-insensitively, else the first list the account can write to. There is no
 * server-side "inbox list" yet — that setting belongs to the GTD work — so the
 * choice lives in the extension.
 */
export function resolveList(lists: List[], preferredName: string | undefined): List | undefined {
  const usable = lists.filter((list) => !list.archived);
  const wanted = preferredName?.trim().toLowerCase();
  if (wanted) {
    const match = usable.find((list) => list.name.trim().toLowerCase() === wanted);
    if (match) return match;
  }
  return usable[0];
}

export default async function Command(props: LaunchProps<{ arguments: { title: string } }>) {
  const title = props.arguments.title.trim();
  if (!title) {
    await showToast({ style: Toast.Style.Failure, title: "A task needs a title" });
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Creating task" });
  try {
    const { defaultList } = preferences();
    const bundle = await getBundle();
    const list = resolveList(bundle.lists, defaultList);

    if (!list) {
      toast.style = Toast.Style.Failure;
      toast.title = "No list to write to";
      toast.message = defaultList?.trim()
        ? `No list is named “${defaultList.trim()}”. Check the extension preferences.`
        : "This account has no list yet — create one in Hule first.";
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
