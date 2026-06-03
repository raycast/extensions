import {
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import type { SortOrder, GroupBy } from "./types";
import { validatePaths } from "./storage";

export interface Preferences {
  /** Path to the todo.txt file */
  todoFilePath: string;
  /** Path to the done.txt file (optional) */
  doneFilePath?: string;
  /** Whether to move completed tasks to done.txt */
  archiveDone: boolean;
  /** Default sort order for the list view */
  defaultSort: SortOrder;
  /** Whether to show completed tasks in the list */
  showCompleted: boolean;
  /** How to group tasks in the list view */
  groupBy: GroupBy;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

/**
 * Run path validation once on mount. Shows a persistent failure toast with an
 * "Open Preferences" button if anything is misconfigured. Returns whether the
 * paths are valid so commands can gate their UI accordingly.
 */
export function useValidatedPrefs(): {
  prefs: Preferences;
  pathsValid: boolean;
} {
  const prefs = getPreferences();
  const [pathsValid, setPathsValid] = useState(true);

  useEffect(() => {
    validatePaths(prefs.todoFilePath, prefs.doneFilePath).then((error) => {
      if (error) {
        setPathsValid(false);
        showToast({
          style: Toast.Style.Failure,
          title: "Configuration error",
          message: error,
          primaryAction: {
            title: "Open Preferences",
            onAction: () => openExtensionPreferences(),
          },
        });
      } else {
        setPathsValid(true);
      }
    });
  }, []);

  return { prefs, pathsValid };
}
