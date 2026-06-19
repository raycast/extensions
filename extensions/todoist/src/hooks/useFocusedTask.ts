import { getPreferenceValues, Toast, environment, showToast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";

import { initialSync, SyncData, Task, updateTask } from "../api";
import { truncateMiddle } from "../helpers/menu-bar";

import useCachedData from "./useCachedData";

export const useFocusedTask = () => {
  const { taskWidth } = getPreferenceValues<Preferences.MenuBar>();
  const { focusLabelName } = getPreferenceValues<Preferences>();

  const { commandMode } = environment;

  const [focusedTask, setFocusedTask] = useCachedState("todoist.focusedTask", { id: "", content: "" });
  const [data, setData] = useCachedData();

  async function unfocusTask() {
    if (!focusedTask.id) {
      return;
    }

    if (focusLabelName && focusLabelName.trim().length > 0) {
      if (commandMode === "view") {
        await showToast({ style: Toast.Style.Animated, title: "Removing focus label" });
      }

      // Need to sync the task before removing the label to avoid race condition.
      const syncData = (await initialSync()) as SyncData;
      const task = syncData.items.find((t) => t.id === focusedTask.id);

      if (task) {
        const labels = task.labels.filter((label) => label !== focusLabelName.trim());
        await updateTask({ id: focusedTask.id, labels }, { data: syncData, setData });
      }
    }

    setFocusedTask({ id: "", content: "" });

    if (commandMode === "view") {
      await showToast({ style: Toast.Style.Success, title: "No more focus" });
    }
  }

  async function focusTask({ id, content, labels }: Task) {
    setFocusedTask({ id, content });

    if (focusLabelName && focusLabelName.trim().length > 0) {
      if (commandMode === "view") {
        await showToast({ style: Toast.Style.Animated, title: "Adding focus label" });
      }

      await updateTask({ id, labels: [...labels, focusLabelName.trim()] }, { data, setData });
    }

    if (commandMode === "view") {
      await showToast({ style: Toast.Style.Success, title: `Focus on "${content}" 🎯` });
    }
  }

  useEffect(() => {
    focusedTask.content = truncateMiddle(focusedTask.content, parseInt(taskWidth ?? "40"));
  }, [focusedTask, taskWidth]);

  return { focusedTask, unfocusTask, focusTask };
};
