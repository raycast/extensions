import { environment, launchCommand, LaunchType, updateCommandMetadata } from "@raycast/api";
import { loadSettings, Settings } from "./lib/settings";
import { subtitleFor, tick } from "./lib/engine";

/**
 * Background engine (every minute) and root search entry.
 *
 * In the background it keeps reminders filled ahead, opens popups if enabled, and keeps the
 * subtitle current. Opened by the user, it does the same and then shows Today's Prayers.
 */
export default async function Command() {
  let settings: Settings;
  try {
    settings = await loadSettings();
  } catch {
    await updateCommandMetadata({ subtitle: "Set your location to start" });
    if (environment.launchType === LaunchType.UserInitiated) {
      await launchCommand({ name: "set-location", type: LaunchType.UserInitiated });
    }
    return;
  }

  const now = new Date();
  const result = await tick(settings, now);
  const subtitle = subtitleFor(result.slots, result.prayed, now);
  const flag = result.syncError ? " · ⚠ Reminders" : settings.warnings.length ? " · ⚠ Check jamaat rules" : "";
  await updateCommandMetadata({ subtitle: `${subtitle}${flag}` });

  if (result.popups > 0 || result.changedReminders > 0) {
    try {
      await launchCommand({ name: "menu-bar", type: LaunchType.Background });
    } catch {
      // Menu bar command not enabled; nothing to refresh.
    }
  }

  if (environment.launchType === LaunchType.UserInitiated) {
    await launchCommand({ name: "today", type: LaunchType.UserInitiated });
  }
}
