/**
 * Energy command: system power draw and die temperatures over time, and every
 * running app sorted by energy impact.
 */

import { Color, Icon, List } from "@raycast/api";
import { AppGroupActions } from "./components/Actions";
import { ErrorNotice } from "./components/ErrorNotice";
import { InactiveNotice } from "./components/InactiveNotice";
import { RangeDropdown } from "./components/RangeDropdown";
import { AppGroup } from "./data/types";
import { useLiveStats } from "./hooks/useLiveStats";
import { generateAreaChart, generateDualAreaChart } from "./utils/charts";
import { formatPercent } from "./utils/formatting";

/** Energy impact uses Activity Monitor's scale: red above 25, orange above 10. */
function energyTagColor(energyImpact: number): Color {
  if (energyImpact > 25) {
    return Color.Red;
  }
  if (energyImpact > 10) {
    return Color.Orange;
  }
  return Color.Yellow;
}

export default function Command() {
  const stats = useLiveStats({ sortMetric: "energy" });
  const snapshot = stats.snapshot;

  if (stats.isLoading) {
    return <List isLoading searchBarPlaceholder="Loading energy telemetry..." />;
  }
  if (stats.error !== undefined) {
    return <ErrorNotice error={stats.error} onRetry={stats.refresh} />;
  }
  if (!stats.isAppRunning || snapshot === null) {
    return <InactiveNotice />;
  }

  const powerValues = stats.history.map((point) => point.powerWatts);
  const powerChart = generateAreaChart(powerValues, { label: "Power Draw", color: "#FFD60A", unit: "W" });

  const cpuTemps = stats.history.map((point) => point.cpuTemp);
  const gpuTemps = stats.history.map((point) => point.gpuTemp);
  const thermalChart = generateDualAreaChart(cpuTemps, gpuTemps, {
    title: "Thermals",
    labelA: "CPU Die",
    labelB: "GPU Die",
    colorA: "#FF453A",
    colorB: "#FF9F0A",
    unit: "°C",
  });

  const tick = snapshot.timestamp;
  const markdown =
    "![Power Draw - " +
    tick +
    "](" +
    powerChart +
    "?raycast-width=760)\n\n" +
    "![Thermals - " +
    tick +
    "](" +
    thermalChart +
    "?raycast-width=760)";

  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Filter apps by name..."
      searchBarAccessory={
        <RangeDropdown defaultValue={stats.range} options={stats.availableRanges} onChange={stats.setRange} />
      }
    >
      <List.Section title="Applications by Energy Impact" subtitle={String(stats.apps.length)}>
        {stats.apps.map((app) => (
          <List.Item
            key={app.appName}
            title={app.appName}
            icon={Icon.Bolt}
            accessories={[
              { text: app.energyImpact.toFixed(1), tooltip: "Energy impact (Activity Monitor scale)" },
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
      <List.Item.Detail.Metadata.TagList title="Energy Impact">
        <List.Item.Detail.Metadata.TagList.Item
          text={app.energyImpact.toFixed(1)}
          color={energyTagColor(app.energyImpact)}
        />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Label title="CPU" text={formatPercent(app.cpuPercent)} />
      <List.Item.Detail.Metadata.Label title="GPU" text={formatPercent(app.gpuPercent)} />
      <List.Item.Detail.Metadata.Label title="Processes" text={String(app.processCount)} />
      {app.executablePath !== null && (
        <List.Item.Detail.Metadata.Label title="Executable Path" text={app.executablePath} />
      )}
    </List.Item.Detail.Metadata>
  );
}
