import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { loadSettings, Settings } from "./lib/settings";
import SetLocation from "./set-location";
import { DayView } from "./prayer-calendar";
import { addDays, getDaySchedule, PRAYER_KEYS, prayerName, PrayerSlot, toDateKey } from "./lib/prayers";
import { readSyncError } from "./lib/storage";
import { History, loadHistory, prayedSet, PrayerRecord, syncReminders } from "./lib/tracker";
import { prayerActions as actionsFor, statusAccessory } from "./lib/prayer-actions";
import { NOT_STARTED_GREY, STATUS_COLORS, statusIcon, toneColor } from "./lib/status-icons";
import { dayTone } from "./lib/calendar";
import { STATUS_LABELS } from "./lib/status";
import { fullDayStreak, summarize } from "./lib/stats";
import { formatTime, ltrName } from "./lib/format";

const HISTORY_DAYS = 7;

async function loadData(settings: Settings): Promise<{ history: History; syncError?: string }> {
  const now = new Date();
  const history = await loadHistory(settings, addDays(now, -HISTORY_DAYS), now);
  return { history, syncError: await readSyncError() };
}

export default function Command() {
  const { data: settings, isLoading, error } = usePromise(loadSettings);
  if (!settings) {
    return (
      <List isLoading={isLoading}>
        {!isLoading && (
          <List.EmptyView
            icon={Icon.Pin}
            title="Set your location"
            description={error?.message ?? "Choose a city or use your current location"}
            actions={
              <ActionPanel>
                <Action.Push title="Set Prayer Location" icon={Icon.Pin} target={<SetLocation />} />
              </ActionPanel>
            }
          />
        )}
      </List>
    );
  }
  return <TodayList settings={settings} />;
}

function TodayList({ settings }: { settings: Settings }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(loadData, [settings], { keepPreviousData: true });
  const now = new Date();
  const history = data?.history ?? {};
  const prayed = prayedSet(history);
  const todayKey = toDateKey(now);
  const slots = getDaySchedule(now, settings.schedule);

  const pastDays = Array.from({ length: HISTORY_DAYS }, (_, i) => toDateKey(addDays(now, i - HISTORY_DAYS)));
  // Today joins the totals and streak only once all five are prayed, so an unfinished day doesn't drag them down.
  const todayDone = PRAYER_KEYS.every((key) => history[todayKey]?.[key]?.completed);
  const countedDays = todayDone ? [...pastDays, todayKey] : pastDays;
  const week = summarize(history, countedDays);
  const streak = fullDayStreak(history, countedDays);

  const prayerActions = (slot: PrayerSlot, record: PrayerRecord | undefined) =>
    actionsFor(slot, record, settings, now, revalidate);

  const syncNow = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating reminders…" });
    try {
      const outcome = await syncReminders(settings, new Date(), true);
      toast.style = Toast.Style.Success;
      toast.title = `Reminders up to date · ${settings.plan.days} days`;
      toast.message = `${outcome.created} created, ${outcome.updated} moved`;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not update reminders";
      toast.message = err instanceof Error ? err.message : String(err);
    }
    revalidate();
  };

  const commonActions = (
    <>
      {settings.reminders.enabled && (
        <Action
          title="Update Reminders Now"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={syncNow}
        />
      )}
      <Action
        title="Open Reminders"
        icon={Icon.CheckList}
        onAction={() => open("/System/Applications/Reminders.app")}
      />
      <Action.Push
        title="Change Location"
        icon={settings.location.mode === "current" ? Icon.Geopin : Icon.Pin}
        shortcut={{ modifiers: ["cmd"], key: "l" }}
        target={<SetLocation />}
      />
      <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </>
  );

  const problem = error?.message ?? data?.syncError;
  const warning = settings.warnings.join(" · ");

  return (
    <List isLoading={isLoading}>
      <List.Section
        title={`Today · ${now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}`}
        subtitle={problem ? `Reminders: ${problem}` : warning ? `⚠ ${warning}` : settings.location.label}
      >
        {slots.map((slot) => {
          const done = prayed.has(slot.id);
          const record = history[todayKey]?.[slot.key];
          // Accessories line up from the right: the status tag, whose width varies, goes first and every row
          // keeps the same time columns (--:-- when a prayer has none).
          const accessories: List.Item.Accessory[] = [
            statusAccessory(slot, record, now),
            {
              text: `Jamaat ${slot.jamaat ? formatTime(slot.jamaat) : "--:--"}`,
              icon: { source: "masjid.png", tintColor: Color.SecondaryText },
            },
            {
              text: `Preferred until ${slot.preferredEnd ? formatTime(slot.preferredEnd) : "--:--"}`,
              tooltip: "After this the prayer is still valid, but less preferred (for some prayers, disliked)",
            },
            { text: `Ends ${formatTime(slot.end)}` },
          ];
          return (
            <List.Item
              key={slot.id}
              icon={done && record?.status ? statusIcon(record.status) : Icon.Circle}
              title={slot.name}
              subtitle={formatTime(slot.start)}
              accessories={accessories}
              actions={
                <ActionPanel>
                  {prayerActions(slot, record)}
                  {commonActions}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section
        title={`Today and Last ${HISTORY_DAYS} Days`}
        subtitle={
          week.knownDays
            ? `${week.prayed}/${week.total} prayed · ${week.onTime} on time · ${week.jamaat} with jamaat` +
              (week.madeUp ? ` · ${week.madeUp} made up` : "")
            : "No reminder history yet"
        }
      >
        <List.Item
          icon={Icon.BarChart}
          title="By prayer"
          subtitle={PRAYER_KEYS.map(
            (key) => `${ltrName(prayerName(key, false, settings.schedule))} ${week.perPrayer[key]}/${week.knownDays}`,
          ).join("  ")}
          accessories={[{ text: `Full-day streak ${streak}` }]}
          actions={<ActionPanel>{commonActions}</ActionPanel>}
        />
        {[todayKey, ...[...pastDays].reverse()].map((date) => {
          const day = history[date];
          const known = day && Object.keys(day).length > 0;
          const count = PRAYER_KEYS.filter((key) => day?.[key]?.completed).length;
          const tone = dayTone(day, date, todayKey);
          const label = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
            weekday: "short",
            day: "numeric",
            month: "short",
          });
          return (
            <List.Item
              key={date}
              // The same day colors as Prayer Calendar.
              icon={{
                source: count === 5 ? Icon.CheckCircle : tone === "noData" ? Icon.QuestionMarkCircle : Icon.Circle,
                tintColor: toneColor(tone),
              }}
              title={date === todayKey ? `Today, ${label}` : label}
              subtitle={date === todayKey && !todayDone ? "Counts once all 5 are prayed" : undefined}
              // One tag per prayer, same text in every row, so the tags line up as columns of a table.
              accessories={[
                ...PRAYER_KEYS.map((key) => {
                  const status = day?.[key]?.status;
                  return {
                    tag: {
                      value: ltrName(prayerName(key, false, settings.schedule)),
                      color: status ? STATUS_COLORS[status] : NOT_STARTED_GREY,
                    },
                    tooltip: status ? STATUS_LABELS[status] : known ? "Not marked" : "No reminder",
                  };
                }),
                { text: known ? `${count}/5` : "No data" },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Day"
                    icon={Icon.Calendar}
                    target={
                      <DayView settings={settings} initialDate={new Date(`${date}T12:00:00`)} onChange={revalidate} />
                    }
                  />
                  {getDaySchedule(new Date(`${date}T12:00:00`), settings.schedule).map((slot) => (
                    <ActionPanel.Submenu
                      key={slot.id}
                      title={slot.name}
                      icon={day?.[slot.key]?.completed ? Icon.CheckCircle : Icon.Circle}
                    >
                      {prayerActions(slot, day?.[slot.key])}
                    </ActionPanel.Submenu>
                  ))}
                  {commonActions}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
