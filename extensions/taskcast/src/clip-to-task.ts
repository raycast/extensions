import { Clipboard, showToast, Toast } from "@raycast/api";
import { createTask, listTaskLists } from "./api/tasks";
import { applyPriority } from "./lib/priority";
import { getErrorMessage } from "./lib/errors";

export default async function () {
  try {
    const text = await Clipboard.readText();

    if (!text) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard empty",
      });
      return;
    }

    const content = text.trim();

    const lists = await listTaskLists();
    const listId = lists.items?.[0]?.id;
    if (!listId) {
      throw new Error("No task lists found.");
    }

    await createTask(listId, applyPriority(content));

    await showToast({
      style: Toast.Style.Success,
      title: "Task created",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to create task",
      message: getErrorMessage(error),
    });
    throw error;
  }
}
