import { Action, ActionPanel, Color, environment, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import {
  baselineDates,
  buildReport,
  compareToBaseline,
  coverageSummary,
  EMPTY_REPORT,
  formatDuration,
  formatShare,
  usageLabel,
  heroMarkdown,
  peakHourLabel,
  RANGES,
  rangeDates,
  rangeTitle,
  rankOf,
  type RangeDay,
  type RangeId,
  type Report,
  type ReportRow,
} from "./core/report";
import { appIconPng } from "./core/appicon";
import { createStore, type Store } from "./core/store";
import { ClearDataAction } from "./clear";
import { iconCacheDir, iconFor, loadIconPaths } from "./icons";
import { NothingRecordedEmptyView } from "./tracking";

interface Loaded {
  report: Report;
  /** The preceding week, for the "is this normal?" comparison. Null for multi-day ranges. */
  baseline: Report | null;
}

function readDays(store: Store, dates: string[]): Promise<RangeDay[]> {
  // A missing day file is a day with no data, not an error, so readDay returns null.
  return Promise.all(dates.map(async (date) => ({ date, file: await store.readDay(date) })));
}

async function load(range: RangeId): Promise<Loaded> {
  const store = createStore(environment.supportPath);
  const now = Date.now();
  const dates = rangeDates(range, now);
  const baseline = baselineDates(range, now);

  const [days, baselineDaysRead] = await Promise.all([
    readDays(store, dates),
    baseline ? readDays(store, baseline) : Promise.resolve(null),
  ]);

  return {
    report: buildReport(days),
    baseline: baselineDaysRead ? buildReport(baselineDaysRead) : null,
  };
}

/**
 * Convert the selected app's icon once, lazily.
 *
 * Converting every row on open would mean a shell-out per app before the list
 * could draw.
 */
async function heroIcon(key: string | null, paths: Map<string, string> | undefined): Promise<string | null> {
  if (!key || !paths) return null;
  const appPath = paths.get(key.toLowerCase());
  if (!appPath) return null;
  return appIconPng(appPath, key, iconCacheDir());
}

function RowMetadata({ row, loaded }: { row: ReportRow; loaded: Loaded }) {
  const { report, baseline } = loaded;
  const isMultiDay = report.dates.length > 1;

  const rank = rankOf(report, row.key);
  const peak = peakHourLabel(row.hours, isMultiDay);
  const comparison = compareToBaseline(row.seconds, baseline, row.key);

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Usage" text={usageLabel(row.seconds, row.share)} icon={Icon.Clock} />
      {rank ? <List.Item.Detail.Metadata.Label title="Rank" text={`${rank} of ${report.rows.length}`} /> : null}
      {comparison ? (
        <List.Item.Detail.Metadata.Label title="Compared With" text={comparison} icon={Icon.LineChart} />
      ) : null}
      {peak ? (
        <List.Item.Detail.Metadata.Label title={isMultiDay ? "Busiest Time of Day" : "Busiest Hour"} text={peak} />
      ) : null}
      {isMultiDay ? (
        <List.Item.Detail.Metadata.Label
          title="Daily Average"
          text={formatDuration(row.seconds / report.dates.length)}
        />
      ) : null}
      {isMultiDay ? (
        <List.Item.Detail.Metadata.Label title="Days Seen" text={`${row.activeDays} of ${report.dates.length}`} />
      ) : null}
      <List.Item.Detail.Metadata.Label title="Identifier" text={row.key} />
    </List.Item.Detail.Metadata>
  );
}

export default function UsageReport() {
  const [range, setRange] = useState<RangeId>("today");
  const [showingDetail, setShowingDetail] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const { data, isLoading, revalidate } = usePromise(load, [range]);
  const { data: iconPaths } = usePromise(loadIconPaths);
  const { data: heroIconPath } = usePromise(heroIcon, [selectedKey, iconPaths]);

  const loaded: Loaded = data ?? { report: EMPTY_REPORT, baseline: null };
  const { report } = loaded;
  const hasRows = report.rows.length > 0;
  // Idle with no app time is still a tracked range, not an empty one.
  const idleOnly = !hasRows && report.idleSeconds > 0;
  // The detail panel halves the list column, which is too narrow for the full
  // coverage sentence: it wraps and runs into the first row.
  const detailOpen = showingDetail && hasRows;
  const icons = new Map(report.rows.map((row) => [row.key, iconFor(row.key, iconPaths)]));

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={detailOpen}
      onSelectionChange={setSelectedKey}
      searchBarPlaceholder="Filter applications"
      searchBarAccessory={
        <List.Dropdown tooltip="Range" value={range} onChange={(value) => setRange(value as RangeId)}>
          {RANGES.map((option) => (
            <List.Dropdown.Item key={option.id} title={option.title} value={option.id} />
          ))}
        </List.Dropdown>
      }
    >
      {idleOnly && !isLoading ? (
        <List.EmptyView
          icon={Icon.Moon}
          title="Only idle time recorded"
          description={`${coverageSummary(report)}. Apps appear here once one is in use.`}
          actions={
            <ActionPanel>
              <ClearDataAction onCleared={revalidate} />
            </ActionPanel>
          }
        />
      ) : !hasRows && !isLoading ? (
        <NothingRecordedEmptyView onCleared={revalidate} />
      ) : (
        <List.Section
          title={detailOpen ? coverageSummary(report, true) : rangeTitle(range)}
          subtitle={detailOpen ? undefined : coverageSummary(report)}
        >
          {report.rows.map((row) => (
            <List.Item
              key={row.key}
              id={row.key}
              icon={icons.get(row.key) ?? Icon.AppWindow}
              title={row.name}
              // Raycast advises against accessories while the detail pane is open,
              // so the duration moves into the subtitle and the rest into metadata.
              subtitle={showingDetail ? formatDuration(row.seconds) : undefined}
              accessories={
                showingDetail
                  ? undefined
                  : [
                      // Plain secondary text, not a tag: a tag's filled pill pulls
                      // more attention than the duration, which is the real answer.
                      { text: { value: formatShare(row.share), color: Color.SecondaryText } },
                      { text: { value: formatDuration(row.seconds), color: Color.PrimaryText } },
                    ]
              }
              detail={
                <List.Item.Detail
                  markdown={heroMarkdown(row.key === selectedKey ? (heroIconPath ?? null) : null, null) || undefined}
                  metadata={<RowMetadata row={row} loaded={loaded} />}
                />
              }
              actions={
                <ActionPanel>
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
          ))}
        </List.Section>
      )}
    </List>
  );
}
