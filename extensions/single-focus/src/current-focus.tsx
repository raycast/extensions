import { showHUD, environment, getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import { getFocus, getLastReminder, isPaused, showFocus } from "./utils";

interface Preferences {
  interval: "10s" | "30s" | "1m" | "2m" | "3m" | "5m" | "10m" | "30m";
}

export default async function currentFocus() {
  if (isPaused()) {
    return null;
  }

  const preferences = getPreferenceValues<Preferences>();
  const focus = getFocus();

  if (!focus.text && environment.launchType === "userInitiated") {
    return showHUD("❌ Missing Focus");
  }

  if (!focus.text) {
    return;
  }

  await updateCommandMetadata({ subtitle: focus.text });

  if (environment.launchType === "userInitiated") {
    return showFocus(focus);
  }

  const interval =
    1000 *
    (preferences.interval.includes("s")
      ? parseInt(preferences.interval.replace("s", ""))
      : parseInt(preferences.interval.replace("m", "")) * 60);

  const lastReminder = getLastReminder();

  if (Date.now() - lastReminder > interval) {
    return showFocus(focus);
  }
}
