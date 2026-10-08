import {
  Cache,
  environment,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  open,
  updateCommandMetadata,
} from "@raycast/api";
import { getData } from "swift:../swift/AppleReminders";

import { truncate } from "./helpers";
import {
  findNextReminder,
  formatRelativeDue,
  MENU_BAR_LISTS_KEY,
  parseMinutesPreference,
} from "./helpers/next-reminder";
import { Data } from "./hooks/useData";

function selectedListIds(): string[] {
  try {
    const raw = new Cache().get(MENU_BAR_LISTS_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

export default async function Command() {
  const { showWithin } = getPreferenceValues<Preferences.NextReminder>();
  const now = new Date();

  let data: Data;
  try {
    data = (await getData(undefined, undefined)) as Data;
  } catch {
    await updateCommandMetadata({ subtitle: "Allow Reminders access to see your next reminder" });
    return;
  }

  const showBeforeMinutes = parseMinutesPreference(showWithin, 60);
  const match = findNextReminder(data.reminders ?? [], now, {
    listIds: selectedListIds(),
    showBeforeMinutes,
    hideAfterMinutes: 15,
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
      await launchCommand({ name: "my-reminders", type: LaunchType.UserInitiated });
    }
  }
}
