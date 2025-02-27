import { useEffect } from "react";
import { getPreferenceValues, showToast, ToastStyle, openExtensionPreferences } from "@raycast/api";

export default function useApiToken() {
  // Retrieve preferences, including the Dovetail API token
  const preferences = getPreferenceValues<{ dovetailApiToken: string }>();
  const apiToken = preferences.dovetailApiToken;
  // Warn if we don't have an API token
  useEffect(() => {
    if (!apiToken) {
      showToast(
        ToastStyle.Failure,
        "API token missing",
        "Please enter your Dovetail API token in the extension preferences.",
      );
      openExtensionPreferences();
    }
  }, [apiToken]);
  return {
    apiToken,
  };
}
