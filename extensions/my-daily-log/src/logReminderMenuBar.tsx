import {
  Color,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  LocalStorage,
  MenuBarExtra,
  open,
  openCommandPreferences,
  Keyboard,
} from "@raycast/api";
import { runAppleScript, usePromise } from "@raycast/utils";
import { getDailyLogsForDateUseCaseFactory } from "./factories/useCases";
import { capitalize } from "./shared/capitalize";
import { addDays, formatDuration, formatTime, parseTimeOfDay } from "./shared/dates";
import { getDailyLogsPath } from "./shared/paths";
import { getReminderState, ReminderSettings } from "./shared/reminder";

const SNOOZED_UNTIL_KEY = "reminder.snoozedUntil";
const LAST_NOTIFICATION_KEY = "reminder.lastNotificationAt";

function getReminderSettings(): ReminderSettings {
  const preferences = getPreferenceValues<Preferences.LogReminderMenuBar>();
  return {
    intervalMinutes: Number(preferences.reminderIntervalMinutes) || 60,
    startMinutes: parseTimeOfDay(preferences.reminderStartTime) ?? 9 * 60,
    endMinutes: parseTimeOfDay(preferences.reminderEndTime) ?? 18 * 60,
    weekdaysOnly: preferences.reminderWeekdaysOnly ?? true,
  };
}

async function readDate(key: string): Promise<Date | undefined> {
  const value = await LocalStorage.getItem<number>(key);
  return typeof value === "number" ? new Date(value) : undefined;
}

async function notify(message: string) {
  const escape = (text: string) => text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  await runAppleScript(`display notification "${escape(message)}" with title "My Daily Log" sound name "Glass"`);
}

async function loadReminder() {
  const now = new Date();
  const settings = getReminderSettings();
  const useCase = getDailyLogsForDateUseCaseFactory();
  const todayLogs = useCase.execute(now);
  const recentLogs = [...useCase.execute(addDays(now, -1)), ...todayLogs].filter(
    (log) => log.date.getTime() <= now.getTime(),
  );
  const lastLog = recentLogs[recentLogs.length - 1];
  const snoozedUntil = await readDate(SNOOZED_UNTIL_KEY);
  const state = getReminderState(now, lastLog?.date, settings, snoozedUntil);

  if (state.isDue && state.dueAt && getPreferenceValues<Preferences.LogReminderMenuBar>().reminderNotification) {
    const lastNotification = await readDate(LAST_NOTIFICATION_KEY);
    // Notify once per due reminder.
    if (!lastNotification || lastNotification.getTime() < state.dueAt.getTime()) {
      await LocalStorage.setItem(LAST_NOTIFICATION_KEY, now.getTime());
      const since = lastLog ? ` Your last log was ${formatDuration(now.getTime() - lastLog.date.getTime())} ago.` : "";
      await notify(`What have you been working on?${since}`).catch(() => undefined);
    }
  }

  return { state, lastLog, todayLogs, snoozedUntil, now };
}

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(loadReminder, [], {
    failureToastOptions: { title: "Could not load your logs" },
  });

  const isDue = data?.state.isDue ?? false;
  const snoozed = data?.snoozedUntil && data.snoozedUntil.getTime() > Date.now() ? data.snoozedUntil : undefined;

  const snooze = async (minutes: number | undefined) => {
    if (minutes === undefined) {
      await LocalStorage.removeItem(SNOOZED_UNTIL_KEY);
    } else {
      await LocalStorage.setItem(SNOOZED_UNTIL_KEY, Date.now() + minutes * 60_000);
    }
    revalidate();
  };

  const lastLogText = data?.lastLog
    ? `Last log ${formatDuration(data.now.getTime() - data.lastLog.date.getTime())} ago (${formatTime(data.lastLog.date)})`
    : "Nothing logged today";

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={isDue ? { source: Icon.Bell, tintColor: Color.Orange } : "command-icon.png"}
      title={isDue ? "Log" : undefined}
      tooltip={isDue ? "Time to log what you are doing" : lastLogText}
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={isDue ? "Time to log what you've been doing!" : lastLogText} />
        {snoozed && <MenuBarExtra.Item title={`Reminders snoozed until ${formatTime(snoozed)}`} />}
        {!snoozed && data?.state.dueAt && !isDue && (
          <MenuBarExtra.Item title={`Next reminder at ${formatTime(data.state.dueAt)}`} />
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.Plus}
          title="New Log…"
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() => launchCommand({ name: "createLogCommand", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          icon={Icon.List}
          title="Open Today's Logs"
          onAction={() => launchCommand({ name: "dailyLogList", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
      {data && data.todayLogs.length > 0 && (
        <MenuBarExtra.Section title="Today">
          {data.todayLogs
            .slice(-10)
            .reverse()
            .map((log) => (
              <MenuBarExtra.Item
                key={log.id}
                title={capitalize(log.title)}
                subtitle={formatTime(log.date)}
                onAction={() => launchCommand({ name: "dailyLogList", type: LaunchType.UserInitiated })}
              />
            ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        {snoozed ? (
          <MenuBarExtra.Item icon={Icon.Bell} title="Resume Reminders" onAction={() => snooze(undefined)} />
        ) : (
          <MenuBarExtra.Submenu icon={Icon.BellDisabled} title="Snooze Reminders">
            <MenuBarExtra.Item title="30 Minutes" onAction={() => snooze(30)} />
            <MenuBarExtra.Item title="1 Hour" onAction={() => snooze(60)} />
            <MenuBarExtra.Item title="2 Hours" onAction={() => snooze(120)} />
            <MenuBarExtra.Item title="4 Hours" onAction={() => snooze(240)} />
          </MenuBarExtra.Submenu>
        )}
        <MenuBarExtra.Item icon={Icon.Folder} title="Open Logs Folder" onAction={() => open(getDailyLogsPath())} />
        <MenuBarExtra.Item icon={Icon.Gear} title="Configure Reminder…" onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
