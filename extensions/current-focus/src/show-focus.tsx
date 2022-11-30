import { Cache, showHUD, environment, getPreferenceValues } from "@raycast/api";

const cache = new Cache();

interface Preferences {
  reminder: boolean;
  interval: "10s" | "30s" | "1m" | "5m" | "10m" | "30m";
}

export default async function showFocus() {
  const preferences = getPreferenceValues<Preferences>();

  const focus = cache.get("current-focus");
  const visible = cache.get("visible") === "true";

  if (!visible && environment.launchType === "background") {
    return;
  } else {
    cache.set("visible", "true");
  }

  if (!focus && (preferences.reminder || environment.launchType === "userInitiated")) {
    await showHUD("❌ Missing Focus");
    return;
  }

  if (!focus) {
    return;
  }

  if (environment.launchType === "userInitiated") {
    cache.set("last-reminder", Date.now().toString());
    await showHUD(focus);
    return;
  }

  const interval =
    1000 *
    (preferences.interval.includes("s")
      ? parseInt(preferences.interval.replace("s", ""))
      : parseInt(preferences.interval.replace("m", "")) * 60);

  const lastReminder = cache.get("last-reminder");

  if (!lastReminder) {
    cache.set("last-reminder", Date.now().toString());
    await showHUD(focus);
    return;
  } else {
    const lastReminderTime = parseInt(lastReminder);
    const currentTime = Date.now();

    if (currentTime - lastReminderTime > interval) {
      cache.set("last-reminder", currentTime.toString());
      await showHUD(focus);
      return;
    }
  }
}
