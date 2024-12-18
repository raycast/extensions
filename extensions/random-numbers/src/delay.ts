import { getPreferenceValues, showToast, Toast } from "@raycast/api";

interface DelayPreferences {
  enableDelay?: boolean;
  delay?: string;
}

function getDelayMs(): number | null {
  const preferences = getPreferenceValues<DelayPreferences>();
  if (!preferences.enableDelay || !preferences.delay) {
    return null;
  }

  const delayValue = parseInt(preferences.delay);
  if (isNaN(delayValue)) {
    return null;
  }

  return delayValue;
}

export default async function maybeWait() {
  const delayMs = getDelayMs();
  if (delayMs === null) {
    return;
  }
  const toast = await showToast({ style: Toast.Style.Animated, title: "Loading..." });
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  await toast.hide();
}
