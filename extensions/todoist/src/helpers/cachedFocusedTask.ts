import { getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

export const useCachedFocusedTask = () => {
  const [cachedFocusedTask, setCachedFocusedTask] = useCachedState("todoist.focusedTask", { id: "", content: "" });

  const clearCachedFocusedTask = () => setCachedFocusedTask({ id: "", content: "" });

  return { cachedFocusedTask, setCachedFocusedTask, clearCachedFocusedTask };
};

export const getFocusFeatureWidth = () => getPreferenceValues().focusFeatureWidth;
