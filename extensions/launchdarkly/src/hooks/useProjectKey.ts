import { useCachedState } from "@raycast/utils";
import { getDefaultProjectKey } from "../api/client";

const SELECTED_PROJECT_KEY = "SELECTED_PROJECT_KEY";

/**
 * The active project: the one picked via "Switch Project", falling back to the
 * project key preference. Backed by the Raycast cache so every command and every
 * mounted view sees the same value and updates together.
 */
export function useProjectKey() {
  const [selected, setSelected] = useCachedState<string>(SELECTED_PROJECT_KEY, "");
  const defaultKey = getDefaultProjectKey();
  const projectKey = selected.trim() || defaultKey;

  return {
    projectKey,
    isDefault: projectKey === defaultKey,
    isLoading: false,
    setProjectKey: (key: string) => setSelected(key),
    resetProjectKey: () => setSelected(""),
  };
}
