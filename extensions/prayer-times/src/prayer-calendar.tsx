import { Action, ActionPanel, Color, environment, Icon, List } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { useState } from "react";
import SetLocation from "./set-location";
import { dayTone, monthDays, PANEL_WIDTH, panelSvg, prayedCount } from "./lib/calendar";
import { formatTime, ltrName } from "./lib/format";
import { prayerActions, saveHistoryAction, statusAccessory } from "./lib/prayer-actions";
import { addDays, getDaySchedule, PRAYER_KEYS, PrayerSlot, toDateKey } from "./lib/prayers";
import { loadSettings, Settings } from "./lib/settings";
import { summarize } from "./lib/stats";
import { STATUS_LABELS } from "./lib/status";
import { STATUS_COLORS, statusIcon, toneColor } from "./lib/status-icons";
import { History, loadHistory, PrayerRecord } from "./lib/tracker";

/** Months offered in the month picker: this month first (Raycast opens on the first item), then two years back. */
const MONTHS_BACK = 24;

/** `YYYY-MM` for a date. */
const monthKey = (date: Date) => toDateKey(date).slice(0, 7);

const monthLabel = (key: string) =>
  new Date(`${key}-15T12:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });

const dayLabel = (date: Date) =>
  date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/**
 * Markdown for an SVG image saved in the support folder (Raycast's Markdown shows local images, not inline
 * SVG). Named by its content so a changed calendar is never served stale; older calendars are removed.
 */
function svgImage(svg: string, width: number): string {
  const dir = join(environment.supportPath, "calendar");
  const name = `${createHash("sha1").update(svg).digest("hex").slice(0, 12)}.svg`;
  mkdirSync(dir, { recursive: true });
  for (const old of readdirSync(dir)) if (old !== name) rmSync(join(dir, old), { force: true });
  writeFileSync(join(dir, name), svg);
  return `![Calendar](file://${encodeURI(join(dir, name))}?raycast-width=${width})`;
}

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
  return <MonthView settings={settings} />;
}

/** Days of a month on the left; the whole month and the selected day's prayers on the right. */
function MonthView({ settings }: { settings: Settings }) {
  const now = new Date();
  const todayKey = toDateKey(now);
  const [month, setMonth] = useState(monthKey(now));
  const [year, monthIndex] = month.split("-").map(Number);
  const { dates } = monthDays(year, monthIndex - 1);
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

  const months = Array.from({ length: MONTHS_BACK + 1 }, (_, i) =>
    monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)),
  );
  // Stay within the months the picker offers.
  const shift = (by: number) => {
    const next = monthKey(new Date(year, monthIndex - 1 + by, 1));
    if (months.includes(next)) setMonth(next);
  };
  const keys = dates.map((date) => toDateKey(date));
  const known = summarize(history, keys);
  const toneOf = (key: string) => dayTone(history[key], key, todayKey);
  const totals = known.knownDays
    ? `${known.prayed}/${known.total} prayed · ${known.jamaat} with jamaat · ${known.madeUp} made up`
    : "No reminder history this month";
  const initial = keys.includes(todayKey) ? todayKey : keys[0];
  const [selection, setSelection] = useState<string | null>(initial);
  const shown = selection && keys.includes(selection) ? selection : initial;
  const shownDate = dates[keys.indexOf(shown)];
  // Only the selected day's detail is visible, so one image (for that day) serves every row.
  const panel = svgImage(
    panelSvg(
      year,
      monthIndex - 1,
      toneOf,
      todayKey,
      shown,
      dayLabel(shownDate),
      getDaySchedule(shownDate, settings.schedule).map((slot) => ({
        name: slot.name,
        start: formatTime(slot.start),
        jamaat: slot.jamaat && formatTime(slot.jamaat),
        end: formatTime(slot.end),
        status: history[shown]?.[slot.key]?.status,
      })),
      environment.appearance,
    ),
    PANEL_WIDTH,
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      filtering={false}
      selectedItemId={initial}
      onSelectionChange={setSelection}
      searchBarPlaceholder="Pick a month on the right"
      searchBarAccessory={
        <List.Dropdown tooltip="Month" value={month} onChange={setMonth}>
          {months.map((key) => (
            <List.Dropdown.Item key={key} title={monthLabel(key)} value={key} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title={monthLabel(month)} subtitle={totals}>
        {dates.map((date) => {
          const key = toDateKey(date);
          const day = history[key];
          const tone = toneOf(key);
          const slots = getDaySchedule(date, settings.schedule);

          return (
            <List.Item
              key={key}
              id={key}
              icon={{ source: Icon.CircleFilled, tintColor: toneColor(tone) }}
              title={`${date.toLocaleDateString(undefined, { weekday: "short" })} ${date.getDate()}`}
              subtitle={[
                key === todayKey ? "Today" : "",
                tone === "future" || tone === "noData" ? "" : `${prayedCount(day)}/${PRAYER_KEYS.length}`,
              ]
                .filter(Boolean)
                .join(" · ")}
              detail={<List.Item.Detail markdown={panel} />}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Day"
                    icon={Icon.Calendar}
                    target={<DayView settings={settings} initialDate={date} onChange={revalidate} />}
                  />
                  {slots
                    .filter((slot) => slot.start <= now)
                    .map((slot) => {
                      const record = day?.[slot.key];
                      return (
                        <ActionPanel.Submenu
                          key={slot.id}
                          title={`Mark ${ltrName(slot.name)}`}
                          icon={record?.status ? statusIcon(record.status) : Icon.Circle}
                        >
                          {prayerActions(slot, record, settings, now, revalidate)}
                        </ActionPanel.Submenu>
                      );
                    })}
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
                  {saveHistoryAction(settings, revalidate)}
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
      </List.Section>
    </List>
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
          {/* Cached history holds completedAt as a string. */}
          {record?.completedAt && (
            <List.Item.Detail.Metadata.Label title="Prayed At" text={formatTime(new Date(record.completedAt))} />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function DayView({
  settings,
  initialDate,
  onChange,
}: {
  settings: Settings;
  initialDate: Date;
  onChange: () => void;
}) {
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
            : // Accessories line up from the right, so the fixed-width times go last and the status tag,
              // whose width varies, goes first; every row keeps the same columns.
              [
                statusAccessory(slot, record, now),
                {
                  text: `Jamaat ${slot.jamaat ? formatTime(slot.jamaat) : "--:--"}`,
                  icon: { source: "masjid.png", tintColor: Color.SecondaryText },
                },
                { text: `Ends ${formatTime(slot.end)}` },
                {
                  // Cached history holds completedAt as a string.
                  text: `Prayed ${record?.completed && record.completedAt ? formatTime(new Date(record.completedAt)) : "--:--"}`,
                  icon: Icon.Clock,
                },
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
