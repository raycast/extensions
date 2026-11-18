import {
  Cache,
  environment,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  open,
  updateCommandMetadata,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getData } from "swift:../swift/AppleReminders";

import { truncate } from "./helpers";
import {
  DISMISSED_KEY,
  findNextReminder,
  formatRelativeDue,
  LEGACY_MENU_BAR_LIST_KEY,
  MENU_BAR_LISTS_KEY,
  parseMinutesPreference,
  resolveListSelection,
} from "./helpers/next-reminder";
import { Data } from "./hooks/useData";

/** Read a value the menu bar stored with `useCachedState`; undefined when missing or unreadable. */
function readCached(key: string): unknown {
  try {
    const raw = new Cache().get(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

export default async function Command() {
  const { showWithin, keepShown } = getPreferenceValues<Preferences.NextReminder>();
  const now = new Date();

  let data: Data;
  try {
    data = (await getData(undefined, undefined)) as Data;
  } catch {
    await updateCommandMetadata({ subtitle: "Allow Reminders access to see your next reminder" });
    return;
  }

  const showBeforeMinutes = parseMinutesPreference(showWithin, 60);
  const dismissed = readCached(DISMISSED_KEY);
  const match = findNextReminder(data.reminders ?? [], now, {
    lists: resolveListSelection(readCached(MENU_BAR_LISTS_KEY), readCached(LEGACY_MENU_BAR_LIST_KEY)),
    dismissed: isRecord(dismissed) ? dismissed : {},
    showBeforeMinutes,
    hideAfterMinutes: parseMinutesPreference(keepShown, null),
  });

  if (match) {
    const list = match.reminder.list?.title ? ` · ${match.reminder.list.title}` : "";
    await updateCommandMetadata({
      subtitle: `${truncate(match.reminder.title, 40)} · ${formatRelativeDue(match.due, now)}${list}`,
    });
  } else {
    await updateCommandMetadata({
      subtitle: showBeforeMinutes === null ? "No upcoming reminders" : "Nothing due soon",
    });
  }

  if (environment.launchType === LaunchType.UserInitiated) {
    if (match) {
      await open(match.reminder.openUrl, "com.apple.reminders");
    } else {
      try {
        await launchCommand({ name: "my-reminders", type: LaunchType.UserInitiated });
      } catch (error) {
        await showFailureToast(error, { title: "Could not open My Reminders" });
      }
    }
  }
}

function isRecord(value: unknown): value is Record<string, string> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
