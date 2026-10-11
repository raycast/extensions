import { Action, ActionPanel, Color, environment, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { dayChartMarkdown } from "./core/chart";
import {
  buildReport,
  dayTitle,
  formatDuration,
  formatShare,
  hourProfiles,
  peakHourLabel,
  presenceLabel,
  rangeDates,
  type RangeId,
  type Report,
} from "./core/report";
import { ClearDataAction } from "./clear";
import { createStore } from "./core/store";
import { iconFor, loadIconPaths } from "./icons";
import { NothingRecordedEmptyView } from "./tracking";

/** How far back the list reaches. One row per day, newest first. */
const RANGE: RangeId = "last7";
/** Applications listed beside the chart before the rest are left to the drill-down. */
const METADATA_APP_LIMIT = 8;

interface Day {
  date: string;
  title: string;
  /** Built from that day alone, so nothing here is an average or a sum of days. */
  report: Report;
}

async function load(): Promise<Day[]> {
  const store = createStore(environment.supportPath);
  const now = Date.now();

  const days = await Promise.all(
    rangeDates(RANGE, now).map(async (date) => ({
      date,
      title: dayTitle(date, now),
      report: buildReport([{ date, file: await store.readDay(date) }]),
    })),
  );

  // Newest first: today is what you came to look at.
  return days.reverse();
}

function isTracked(report: Report): boolean {
  return report.totalSeconds > 0 || report.idleSeconds > 0;
}

/** That day's applications as a list, where an icon can sit left of its name. */
function DayApps({ day, iconPaths }: { day: Day; iconPaths: Map<string, string> | undefined }) {
  const { report } = day;

  return (
    <List navigationTitle={day.title} searchBarPlaceholder="Filter applications">
      <List.Section title={day.title} subtitle={presenceLabel(report.totalSeconds, report.idleSeconds)}>
        {report.rows.map((row) => (
          <List.Item
            key={row.key}
            icon={iconFor(row.key, iconPaths)}
            title={row.name}
            accessories={[
              { text: { value: formatShare(row.share), color: Color.SecondaryText } },
              { text: { value: formatDuration(row.seconds), color: Color.PrimaryText } },
            ]}
          />
        ))}
      </List.Section>
    </List>
  );
}

function DayMetadata({ day, iconPaths }: { day: Day; iconPaths: Map<string, string> | undefined }) {
  const { report } = day;
  const shown = report.rows.slice(0, METADATA_APP_LIMIT);
  const hidden = report.rows.length - shown.length;
  const peak = peakHourLabel(hourProfiles(report).active);

  return (
    <List.Item.Detail.Metadata>
      {shown.map((row) => (
        <List.Item.Detail.Metadata.Label
          key={row.key}
          title={row.name}
          icon={iconFor(row.key, iconPaths)}
          text={`${formatDuration(row.seconds)} · ${formatShare(row.share)}`}
        />
      ))}
      {hidden > 0 ? <List.Item.Detail.Metadata.Label title={`and ${hidden} more`} text="Press Enter" /> : null}
      {shown.length > 0 ? <List.Item.Detail.Metadata.Separator /> : null}
      {peak ? <List.Item.Detail.Metadata.Label title="Busiest Hour" text={peak} /> : null}
      {report.idleSeconds > 0 ? (
        <List.Item.Detail.Metadata.Label title="Idle" text={formatDuration(report.idleSeconds)} icon={Icon.Moon} />
      ) : null}
      <List.Item.Detail.Metadata.Label
        title="At the Machine"
        text={formatDuration(report.totalSeconds + report.idleSeconds)}
        icon={Icon.Clock}
      />
    </List.Item.Detail.Metadata>
  );
}

export default function DailyUsage() {
  // The chart is the point of this view, so it opens showing it.
  const [showingDetail, setShowingDetail] = useState(true);
  const { data, isLoading, revalidate } = usePromise(load);
  const { data: iconPaths } = usePromise(loadIconPaths);

  const days = data ?? [];
  // A week of "Not tracked" rows would not say why. With nothing recorded at all,
  // explain how to turn tracking on instead.
  const nothingRecorded = data !== undefined && !days.some((day) => isTracked(day.report));

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail && days.length > 0 && !nothingRecorded}
      searchBarPlaceholder="Filter days"
    >
      {nothingRecorded ? (
        <NothingRecordedEmptyView onCleared={revalidate} />
      ) : (
        <List.Section title="Last 7 Days">
          {days.map((day) => {
            const { report } = day;
            const tracked = isTracked(report);
            const top = report.rows[0];
            const profile = hourProfiles(report);

            return (
              <List.Item
                key={day.date}
                icon={top ? iconFor(top.key, iconPaths) : Icon.Calendar}
                title={day.title}
                subtitle={tracked ? (top?.name ?? "Idle") : "Not tracked"}
                accessories={
                  showingDetail
                    ? undefined
                    : [
                        {
                          text: {
                            value: tracked ? formatDuration(report.totalSeconds) : "—",
                            color: tracked ? Color.PrimaryText : Color.SecondaryText,
                          },
                        },
                      ]
                }
                detail={
                  <List.Item.Detail
                    markdown={
                      tracked
                        ? dayChartMarkdown(profile, { appearance: environment.appearance })
                        : "_Nothing was recorded on this day._"
                    }
                    metadata={<DayMetadata day={day} iconPaths={iconPaths} />}
                  />
                }
                actions={
                  <ActionPanel>
                    {report.rows.length > 0 ? (
                      <Action.Push
                        title="Show Applications"
                        icon={Icon.AppWindowList}
                        target={<DayApps day={day} iconPaths={iconPaths} />}
                      />
                    ) : null}
                    <Action
                      title={showingDetail ? "Hide Details" : "Show Details"}
                      icon={Icon.Sidebar}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={() => setShowingDetail((value) => !value)}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={() => revalidate()}
                    />
                    <ActionPanel.Section>
                      <ClearDataAction onCleared={revalidate} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
