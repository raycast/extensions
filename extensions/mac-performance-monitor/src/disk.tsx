/**
 * Disk command: read/write throughput history and the apps doing disk I/O right
 * now. Per-app figures are rates over the recent sampling window, not lifetime totals.
 */

import { Color, Icon, List } from "@raycast/api";
import { AppGroupActions } from "./components/Actions";
import { ErrorNotice } from "./components/ErrorNotice";
import { InactiveNotice } from "./components/InactiveNotice";
import { RangeDropdown } from "./components/RangeDropdown";
import { AppGroup } from "./data/types";
import { useLiveStats } from "./hooks/useLiveStats";
import { generateDualAreaChart } from "./utils/charts";
import { formatRate } from "./utils/formatting";

const ONE_MB = 1024 * 1024;

/** Red above 50 MB/s, orange above 5 MB/s. */
function diskTagColor(bytesPerSecond: number): Color {
  if (bytesPerSecond > 50 * ONE_MB) {
    return Color.Red;
  }
  if (bytesPerSecond > 5 * ONE_MB) {
    return Color.Orange;
  }
  return Color.Blue;
}

export default function Command() {
  const stats = useLiveStats({ sortMetric: "disk" });
  const snapshot = stats.snapshot;

  if (stats.isLoading) {
    return <List isLoading searchBarPlaceholder="Loading disk telemetry..." />;
  }
  if (stats.error !== undefined) {
    return <ErrorNotice error={stats.error} onRetry={stats.refresh} />;
  }
  if (!stats.isAppRunning || snapshot === null) {
    return <InactiveNotice />;
  }

  const readValues = stats.history.map((point) => point.diskReadMb);
  const writeValues = stats.history.map((point) => point.diskWriteMb);
  const diskChart = generateDualAreaChart(readValues, writeValues, {
    height: 300,
    title: "Disk Throughput",
    labelA: "Read",
    labelB: "Write",
    colorA: "#64D2FF",
    colorB: "#FF9F0A",
    unit: "MB/s",
  });
  const markdown = "![Disk Throughput - " + snapshot.timestamp + "](" + diskChart + "?raycast-width=760)";

  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Filter apps by name..."
      searchBarAccessory={
        <RangeDropdown defaultValue={stats.range} options={stats.availableRanges} onChange={stats.setRange} />
      }
    >
      <List.Section title="Applications by Disk Activity" subtitle={String(stats.apps.length)}>
        {stats.apps.map((app) => (
          <List.Item
            key={app.appName}
            title={app.appName}
            icon={Icon.HardDrive}
            accessories={[
              { text: formatRate(app.diskReadBytes + app.diskWrittenBytes), tooltip: "Read + write rate" },
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

function AppMetadata(props: AppMetadataProps) {
  const app = props.app;
  const total = app.diskReadBytes + app.diskWrittenBytes;

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="App Name" text={app.appName} />
      <List.Item.Detail.Metadata.TagList title="Disk Rate">
        <List.Item.Detail.Metadata.TagList.Item text={formatRate(total)} color={diskTagColor(total)} />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Label title="Reading" text={formatRate(app.diskReadBytes)} />
      <List.Item.Detail.Metadata.Label title="Writing" text={formatRate(app.diskWrittenBytes)} />
      <List.Item.Detail.Metadata.Label title="Processes" text={String(app.processCount)} />
      {app.executablePath !== null && (
        <List.Item.Detail.Metadata.Label title="Executable Path" text={app.executablePath} />
      )}
    </List.Item.Detail.Metadata>
  );
}
