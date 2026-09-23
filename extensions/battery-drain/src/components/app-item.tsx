import { Action, ActionPanel, environment, Icon, Keyboard, List } from "@raycast/api";
import { appCpuSeries, AppUsage, bundlePath } from "../analysis/apps";
import { cpuSeverity } from "../analysis/severity";
import { chartMarkdown } from "../render/chart-markdown";
import { chartSvg, DETAIL_CHART_HEIGHT } from "../render/chart-svg";
import { ENERGY_TOOLTIP, formatDuration, formatUsage } from "../render/format";
import { SEVERITY_COLOR } from "../render/tint";
import { Sample, Snapshot } from "../types";

/** One app in Diagnose: its CPU chart, with its figures as metadata and its location in the actions. */
export function AppItem(props: { app: AppUsage; snapshot: Snapshot; history: Sample[]; onRefresh: () => void }) {
  const { app, snapshot, history, onRefresh } = props;
  const infos = app.pids.map((pid) => snapshot.processInfo.get(pid)).filter((i) => i !== undefined);
  const bundle = infos.map((i) => bundlePath(i.path)).find((b) => b !== undefined);
  const oldest = infos.length ? Math.max(...infos.map((i) => i.etimeSec)) : undefined;

  const chart = chartMarkdown(
    chartSvg(appCpuSeries(history, app.pids, snapshot.processesAt ?? snapshot.t, app.cpu), environment.appearance, {
      unit: "%",
      height: DETAIL_CHART_HEIGHT,
      tone: cpuSeverity(app.cpu, false),
    }),
  );

  return (
    <List.Item
      icon={{ source: Icon.AppWindowGrid2x2, tintColor: SEVERITY_COLOR[cpuSeverity(app.cpu, false)] }}
      title={app.name}
      subtitle={app.pids.length > 1 ? `${app.pids.length} processes` : undefined}
      accessories={[{ text: formatUsage(app), tooltip: ENERGY_TOOLTIP }]}
      detail={
        <List.Item.Detail
          markdown={chart}
          metadata={
            <List.Item.Detail.Metadata>
              {/* The list row truncates long names ("Microsoft Te…"); the detail has room for them. */}
              <List.Item.Detail.Metadata.Label title="App" text={app.name} />
              <List.Item.Detail.Metadata.Label title="CPU" text={`${app.cpu.toFixed(1)}%`} />
              <List.Item.Detail.Metadata.Label title="Energy Impact" text={app.energy.toFixed(1)} />
              <List.Item.Detail.Metadata.Label title="Processes" text={String(app.pids.length)} />
              {oldest !== undefined && (
                <List.Item.Detail.Metadata.Label title="Running For" text={formatDuration(oldest)} />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {bundle && <Action.ShowInFinder path={bundle} />}
          {bundle && <Action.CopyToClipboard title="Copy Path" content={bundle} />}
          <Action.CopyToClipboard title="Copy PIDs" content={app.pids.join(" ")} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}
