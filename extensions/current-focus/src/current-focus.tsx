import {Cache, showHUD, environment, getPreferenceValues, updateCommandMetadata} from "@raycast/api";
import { getFocus, startFocus } from "./utils";

const cache = new Cache();

interface Preferences {
  reminder: boolean;
  interval: "10s" | "30s" | "1m" | "5m" | "10m" | "30m";
}

export default async function currentFocus() {
  const preferences = getPreferenceValues<Preferences>();
  const focus = getFocus();

  if (!focus && (preferences.reminder || environment.launchType === "userInitiated")) {
    await showHUD("❌ Missing Focus");
    return;
  }

  await updateCommandMetadata({
    subtitle: focus.text
  })

  if (environment.launchType === "userInitiated") {
    return startFocus(focus);
  }

  const interval =
    1000 *
    (preferences.interval.includes("s")
      ? parseInt(preferences.interval.replace("s", ""))
      : parseInt(preferences.interval.replace("m", "")) * 60);

  const lastReminder = cache.get("last-reminder");

  if (!lastReminder) {
    return startFocus(focus);
  } else {
    const lastReminderTime = parseInt(lastReminder);
    const currentTime = Date.now();

    if (currentTime - lastReminderTime > interval) {
      return startFocus(focus);
    }
  }
}
