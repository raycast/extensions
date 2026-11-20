/**
 * Memory command: pressure history, RAM composition, and every running app
 * sorted by memory footprint.
 */

import { Color, Icon, List } from "@raycast/api";
import { AppGroupActions } from "./components/Actions";
import { InactiveNotice } from "./components/InactiveNotice";
import { RangeDropdown } from "./components/RangeDropdown";
import { AppGroup } from "./data/types";
import { useLiveStats } from "./hooks/useLiveStats";
import { generateAreaChart, generateStackedBar } from "./utils/charts";
import { formatBytes } from "./utils/formatting";
import { memorySlices, memorySubtitle, pressureColor } from "./utils/memory";

const ONE_GB = 1024 * 1024 * 1024;

/** Red above 2 GB, orange above 1 GB, blue otherwise. */
function memoryTagColor(bytes: number): Color {
  if (bytes > 2 * ONE_GB) {
    return Color.Red;
  }
  if (bytes > ONE_GB) {
    return Color.Orange;
  }
  return Color.Blue;
}

export default function Command() {
  const stats = useLiveStats({ sortMetric: "memory" });
  const snapshot = stats.snapshot;

  if (stats.isLoading && snapshot === null) {
    return <List isLoading searchBarPlaceholder="Loading memory telemetry..." />;
  }
  if (!stats.isAppRunning || snapshot === null) {
    return <InactiveNotice />;
  }

  // Both charts are shown in the detail pane of every row, so build them once.
  const pressureValues = stats.history.map((point) => point.memoryPressure);
  const pressureChart = generateAreaChart(pressureValues, {
    label: "Memory Pressure",
    color: pressureColor(snapshot.pressurePercent),
    unit: "%",
    maxValue: 100,
  });
  const compositionChart = generateStackedBar(
    memorySlices(snapshot),
    snapshot.totalRam,
    "Memory Composition",
    760,
    90,
    memorySubtitle(snapshot),
  );

  // The timestamp in the image title changes every tick, which makes Raycast redraw the image.
  const tick = snapshot.timestamp;
  const markdown =
    "![Memory Pressure - " +
    tick +
    "](" +
    pressureChart +
    "?raycast-width=760)\n\n" +
    "![Memory Composition - " +
    tick +
    "](" +
    compositionChart +
    "?raycast-width=760)";

  return (
    <List
      isLoading={stats.isLoading}
      isShowingDetail
      searchBarPlaceholder="Filter apps by name..."
      searchBarAccessory={
        <RangeDropdown defaultValue={stats.range} options={stats.availableRanges} onChange={stats.setRange} />
      }
    >
      <List.Section title="Applications by Memory" subtitle={String(stats.apps.length)}>
        {stats.apps.map((app) => (
          <List.Item
            key={app.appName}
            title={app.appName}
            icon={Icon.MemoryChip}
            accessories={[
              { text: formatBytes(app.memoryBytes), tooltip: "Memory footprint across all processes" },
              { text: String(app.processCount), icon: Icon.Layers, tooltip: "Processes" },
            ]}
            detail={<List.Item.Detail markdown={markdown} metadata={<AppMetadata app={app} />} />}
            actions={<AppGroupActions app={app} onRefresh={stats.refresh} />}
          />
        ))}
      </List.Section>
    </List>
  );
}

interface AppMetadataProps {
  app: AppGroup;
}

/** The right-hand metadata column of the detail pane. */
function AppMetadata(props: AppMetadataProps) {
  const app = props.app;

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="App Name" text={app.appName} />
      <List.Item.Detail.Metadata.TagList title="Memory">
        <List.Item.Detail.Metadata.TagList.Item
          text={formatBytes(app.memoryBytes)}
          color={memoryTagColor(app.memoryBytes)}
        />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Label title="Processes" text={String(app.processCount)} />
      {app.executablePath !== null && (
        <List.Item.Detail.Metadata.Label title="Executable Path" text={app.executablePath} />
      )}
    </List.Item.Detail.Metadata>
  );
}
