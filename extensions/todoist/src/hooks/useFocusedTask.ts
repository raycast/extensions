import { getPreferenceValues, Toast, environment, showToast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";

import { Task } from "../api";
import { truncateMiddle } from "../helpers/menu-bar";

export const useFocusedTask = () => {
  const { focusFeatureWidth } = getPreferenceValues<Preferences.MenuBar>();

  const { commandMode } = environment;

  const [focusedTask, setFocusedTask] = useCachedState("todoist.focusedTask", { id: "", content: "" });

  async function unfocusTask() {
    setFocusedTask({ id: "", content: "" });

    if (commandMode === "view") {
      await showToast({ style: Toast.Style.Success, title: "No more focus" });
    }
  }

  async function focusTask({ id, content }: Task) {
    setFocusedTask({ id, content });

    if (commandMode === "view") {
      await showToast({ style: Toast.Style.Success, title: `Focus on "${content}" 🎯` });
    }
  }

  useEffect(() => {
    focusedTask.content = truncateMiddle(focusedTask.content, parseInt(focusFeatureWidth));
  }, [focusedTask.content, focusFeatureWidth]);

  return { focusedTask, unfocusTask, focusTask };
};
