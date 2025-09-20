import { getPreferenceValues, openCommandPreferences, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";

export function useSearchCommandPreferencesValidation() {
  const { primaryAction, secondaryAction } = getPreferenceValues<Preferences.SearchMenuBarApps>();

  useEffect(() => {
    if (primaryAction === secondaryAction) {
      showToast({
        title: "Primary and Secondary Actions Configuration Invalid",
        style: Toast.Style.Failure,
        message:
          "The primary and secondary actions are set to the same value. " +
          "Please change one of them in the preferences.",
        primaryAction: {
          title: "Open Preferences",
          onAction: () => openCommandPreferences(),
        },
      }).then();
    }
  }, [primaryAction, secondaryAction]);
  return { primaryAction, secondaryAction };
}
