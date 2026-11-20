/**
 * GPU command: utilization history and every running app sorted by GPU usage.
 */

import { Color, Icon, List } from "@raycast/api";
import { AppGroupActions } from "./components/Actions";
import { ErrorNotice } from "./components/ErrorNotice";
import { InactiveNotice } from "./components/InactiveNotice";
import { RangeDropdown } from "./components/RangeDropdown";
import { AppGroup } from "./data/types";
import { useLiveStats } from "./hooks/useLiveStats";
import { generateAreaChart } from "./utils/charts";
import { formatPercent } from "./utils/formatting";

function gpuTagColor(gpuPercent: number): Color {
  if (gpuPercent > 20) {
    return Color.Red;
  }
  if (gpuPercent > 5) {
    return Color.Orange;
  }
  return Color.Green;
}

export default function Command() {
  const stats = useLiveStats({ sortMetric: "gpu" });
  const snapshot = stats.snapshot;

  if (stats.isLoading) {
    return <List isLoading searchBarPlaceholder="Loading GPU telemetry..." />;
  }
  if (stats.error !== undefined) {
    return <ErrorNotice error={stats.error} onRetry={stats.refresh} />;
  }
  if (!stats.isAppRunning || snapshot === null) {
    return <InactiveNotice />;
  }

  const gpuValues = stats.history.map((point) => point.gpuPercent);
  const gpuChart = generateAreaChart(gpuValues, { label: "GPU Usage", color: "#30D158", unit: "%", maxValue: 100 });
  const tick = snapshot.timestamp;
  const markdown = "![GPU Usage - " + tick + "](" + gpuChart + "?raycast-width=760)";

  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Filter apps by name..."
      searchBarAccessory={
        <RangeDropdown defaultValue={stats.range} options={stats.availableRanges} onChange={stats.setRange} />
      }
    >
      <List.Section title="Applications by GPU" subtitle={String(stats.apps.length)}>
        {stats.apps.map((app) => (
          <List.Item
            key={app.appName}
            title={app.appName}
            icon={Icon.Eye}
            accessories={[
              { text: formatPercent(app.gpuPercent), tooltip: "GPU usage" },
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

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="App Name" text={app.appName} />
      <List.Item.Detail.Metadata.TagList title="GPU">
        <List.Item.Detail.Metadata.TagList.Item
          text={formatPercent(app.gpuPercent)}
          color={gpuTagColor(app.gpuPercent)}
        />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Label title="Processes" text={String(app.processCount)} />
      {app.executablePath !== null && (
        <List.Item.Detail.Metadata.Label title="Executable Path" text={app.executablePath} />
      )}
    </List.Item.Detail.Metadata>
  );
}
