import { Action, ActionPanel, Color, Grid, Icon, List } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { useState } from "react";
import SetLocation from "./set-location";
import { dayTone, DayTone, monthDays, prayedCount } from "./lib/calendar";
import { formatTime, ltrName } from "./lib/format";
import { prayerActions, statusAccessory } from "./lib/prayer-actions";
import { addDays, getDaySchedule, PRAYER_KEYS, PrayerSlot, toDateKey } from "./lib/prayers";
import { loadSettings, Settings } from "./lib/settings";
import { summarize } from "./lib/stats";
import { STATUS_LABELS } from "./lib/status";
import { STATUS_COLORS, statusIcon } from "./lib/status-icons";
import { History, loadHistory, PrayerRecord } from "./lib/tracker";

/** Months offered in the month picker: two years back and one ahead. */
const MONTHS_BACK = 24;

const TONE_COLORS: Record<DayTone, Color.ColorLike> = {
  full: Color.Green,
  partial: Color.Orange,
  none: Color.Red,
  noData: "rgba(142, 142, 147, 0.25)",
  future: "rgba(142, 142, 147, 0.1)",
};

/** `YYYY-MM` for a date. */
const monthKey = (date: Date) => toDateKey(date).slice(0, 7);

const monthLabel = (key: string) =>
  new Date(`${key}-15T12:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });

const dayLabel = (date: Date) =>
  date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** Reminder history for a date range, nothing for days still ahead. */
async function historyFor(settings: Settings, from: Date, to: Date): Promise<History> {
  const today = new Date();
  if (toDateKey(from) > toDateKey(today)) return {};
  return loadHistory(settings, from, toDateKey(to) > toDateKey(today) ? today : to);
}

export default function Command() {
  const { data: settings, isLoading, error } = usePromise(loadSettings);
  if (!settings) {
    return (
      <Grid isLoading={isLoading}>
        {!isLoading && (
          <Grid.EmptyView
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
      </Grid>
    );
  }
  return <MonthGrid settings={settings} />;
}

function MonthGrid({ settings }: { settings: Settings }) {
  const now = new Date();
  const todayKey = toDateKey(now);
  const [month, setMonth] = useState(monthKey(now));
  const [year, monthIndex] = month.split("-").map(Number);
  const { blanks, dates } = monthDays(year, monthIndex - 1);
  const {
    data: history = {},
    isLoading,
    revalidate,
  } = useCachedPromise(
    (current: Settings, key: string) => {
      const [y, m] = key.split("-").map(Number);
      return historyFor(current, new Date(y, m - 1, 1, 12), new Date(y, m, 0, 12));
    },
    [settings, month],
    { keepPreviousData: true },
  );

  const months = Array.from({ length: MONTHS_BACK + 2 }, (_, i) =>
    monthKey(new Date(now.getFullYear(), now.getMonth() + 1 - i, 1)),
  );
  const shift = (by: number) => setMonth(monthKey(new Date(year, monthIndex - 1 + by, 1)));
  const known = summarize(
    history,
    dates.map((date) => toDateKey(date)),
  );

  return (
    <Grid
      columns={7}
      aspectRatio="16/9"
      inset={Grid.Inset.Medium}
      isLoading={isLoading}
      filtering={false}
      searchBarPlaceholder="Pick a month on the right"
      searchBarAccessory={
        <Grid.Dropdown tooltip="Month" value={month} onChange={setMonth}>
          {months.map((key) => (
            <Grid.Dropdown.Item key={key} title={monthLabel(key)} value={key} />
          ))}
        </Grid.Dropdown>
      }
    >
      <Grid.Section
        title={monthLabel(month)}
        subtitle={
          known.knownDays
            ? `${known.prayed}/${known.total} prayed · ${known.jamaat} with jamaat · ${known.madeUp} made up · Mon–Sun`
            : "Mon–Sun"
        }
      >
        {Array.from({ length: blanks }, (_, i) => (
          <Grid.Item key={`blank-${i}`} content={{ color: "rgba(0, 0, 0, 0)" }} />
        ))}
        {dates.map((date) => {
          const key = toDateKey(date);
          const day = history[key];
          const tone = dayTone(day, key, todayKey);
          const slots = getDaySchedule(date, settings.schedule);
          const tooltip = slots
            .map((slot) => {
              const status = day?.[slot.key]?.status;
              return `${ltrName(slot.name)} ${formatTime(slot.start)}: ${status ? STATUS_LABELS[status] : "—"}`;
            })
            .join("\n");
          return (
            <Grid.Item
              key={key}
              content={{ value: { color: TONE_COLORS[tone] }, tooltip }}
              title={`${date.toLocaleDateString(undefined, { weekday: "short" })} ${date.getDate()}${key === todayKey ? " · Today" : ""}`}
              subtitle={
                tone === "future" ? "" : tone === "noData" ? "No data" : `${prayedCount(day)}/${PRAYER_KEYS.length}`
              }
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Day"
                    icon={Icon.Calendar}
                    target={<DayView settings={settings} initialDate={date} onChange={revalidate} />}
                  />
                  <Action
                    title="Previous Month"
                    icon={Icon.ChevronLeft}
                    shortcut={{ modifiers: ["cmd"], key: "[" }}
                    onAction={() => shift(-1)}
                  />
                  <Action
                    title="Next Month"
                    icon={Icon.ChevronRight}
                    shortcut={{ modifiers: ["cmd"], key: "]" }}
                    onAction={() => shift(1)}
                  />
                  <Action
                    title="Go to This Month"
                    icon={Icon.Calendar}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={() => setMonth(monthKey(new Date()))}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </Grid.Section>
    </Grid>
  );
}

/** Metadata shown when a prayer row is expanded. */
function prayerDetail(slot: PrayerSlot, record: PrayerRecord | undefined) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Starts" text={formatTime(slot.start)} />
          {slot.jamaat && <List.Item.Detail.Metadata.Label title="Jamaat" text={formatTime(slot.jamaat)} />}
          {slot.preferredEnd && (
            <List.Item.Detail.Metadata.Label title="Preferred Until" text={formatTime(slot.preferredEnd)} />
          )}
          <List.Item.Detail.Metadata.Label title="Ends" text={formatTime(slot.end)} />
          <List.Item.Detail.Metadata.Separator />
          {record?.status ? (
            <List.Item.Detail.Metadata.TagList title="Status">
              <List.Item.Detail.Metadata.TagList.Item
                text={STATUS_LABELS[record.status]}
                color={STATUS_COLORS[record.status]}
              />
            </List.Item.Detail.Metadata.TagList>
          ) : (
            <List.Item.Detail.Metadata.Label title="Status" text={record ? "Not marked yet" : "No reminder"} />
          )}
          {record?.completedAt && (
            <List.Item.Detail.Metadata.Label title="Prayed At" text={formatTime(record.completedAt)} />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function DayView({ settings, initialDate, onChange }: { settings: Settings; initialDate: Date; onChange: () => void }) {
  const [date, setDate] = useState(initialDate);
  const [expanded, setExpanded] = useState(false);
  const {
    data: history = {},
    isLoading,
    revalidate,
  } = useCachedPromise((current: Settings, day: Date) => historyFor(current, day, day), [settings, date], {
    keepPreviousData: true,
  });
  const now = new Date();
  const day = history[toDateKey(date)];
  const reload = () => {
    revalidate();
    onChange();
  };

  return (
    <List isLoading={isLoading} isShowingDetail={expanded} navigationTitle={dayLabel(date)}>
      <List.Section title={dayLabel(date)}>
        {getDaySchedule(date, settings.schedule).map((slot) => {
          const record = day?.[slot.key];
          const accessories: List.Item.Accessory[] = expanded
            ? []
            : [
                ...(slot.jamaat ? [{ text: `Jamaat ${formatTime(slot.jamaat)}`, icon: Icon.TwoPeople }] : []),
                { text: `Ends ${formatTime(slot.end)}` },
                statusAccessory(slot, record, now),
              ];
          return (
            <List.Item
              key={slot.id}
              icon={record?.completed && record.status ? statusIcon(record.status) : Icon.Circle}
              title={slot.name}
              subtitle={formatTime(slot.start)}
              accessories={accessories}
              detail={prayerDetail(slot, record)}
              actions={
                <ActionPanel>
                  {prayerActions(slot, record, settings, now, reload)}
                  <Action
                    title={expanded ? "Hide Details" : "Show Details"}
                    icon={Icon.Sidebar}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => setExpanded(!expanded)}
                  />
                  <Action
                    title="Previous Day"
                    icon={Icon.ChevronLeft}
                    shortcut={{ modifiers: ["cmd"], key: "[" }}
                    onAction={() => setDate(addDays(date, -1))}
                  />
                  <Action
                    title="Next Day"
                    icon={Icon.ChevronRight}
                    shortcut={{ modifiers: ["cmd"], key: "]" }}
                    onAction={() => setDate(addDays(date, 1))}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
