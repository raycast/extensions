import {
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { validatePaths } from "./storage";

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
