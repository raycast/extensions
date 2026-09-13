import { Color, List } from "@raycast/api";

import { ProcessInfo } from "../Interfaces";
import { CoreClusterType, coreLabel } from "../lib/cpu-cores";
import { CoreUsage } from "../lib/cpu-stats";
import { usageBar } from "../lib/usage-bar";
import { colorForPressurePercent, pressureFromDisplay, PercentDisplayMode } from "./MetadataLabel";

/** Rows shown under "Top Processes" on the CPU and Memory panes (the approved compact layout). */
export const TOP_PROCESS_ROWS = 3;

/** Placeholder for a value that only loads while its row is selected. */
export function pendingText(isActive: boolean): string {
  return isActive ? "Loading…" : "—";
}

function tagColor(percent: number, displayMode: PercentDisplayMode, override?: Color | null): Color {
  return override ?? colorForPressurePercent(pressureFromDisplay(percent, displayMode));
}

/**
 * One colored percentage tag as a metadata row — the headline of the CPU, Memory, Disk and Power panes.
 * The tag carries a small text gauge (`▓▓▓░░░░░░░ 27 %`) that fills with resource pressure.
 */
export function UsageTag({
  title,
  percent,
  displayMode = "usage",
  color,
}: {
  title: string;
  percent: number;
  displayMode?: PercentDisplayMode;
  /** Override the percent-derived color with a health verdict from another source (e.g. memory pressure). */
  color?: Color | null;
}) {
  return (
    <List.Item.Detail.Metadata.TagList title={title}>
      <List.Item.Detail.Metadata.TagList.Item
        text={`${usageBar(pressureFromDisplay(percent, displayMode))} ${percent} %`}
        color={tagColor(percent, displayMode, color)}
      />
    </List.Item.Detail.Metadata.TagList>
  );
}

/** Per-core usage as one wrapping row of labeled colored tags (`P3: 36%`, or `C3: 36%` when unverified). */
export function PerCoreTagRows({
  cores,
  clusterTypes,
}: {
  cores: CoreUsage[];
  clusterTypes?: CoreClusterType[] | null;
}) {
  return (
    <List.Item.Detail.Metadata.TagList title="Per-Core">
      {cores.map((core) => (
        <List.Item.Detail.Metadata.TagList.Item
          key={core.core}
          text={`${coreLabel(core.core, clusterTypes)}: ${core.usage}%`}
          color={colorForPressurePercent(core.usage)}
        />
      ))}
    </List.Item.Detail.Metadata.TagList>
  );
}

/** "Top Processes" header plus one row per process, or a placeholder while the first sample collects. */
export function TopProcessRows({ processes }: { processes?: ProcessInfo[] }) {
  return (
    <>
      <List.Item.Detail.Metadata.Label title="Top Processes" />
      {processes?.length ? (
        processes.map((process, index) => (
          <List.Item.Detail.Metadata.Label
            key={process.pid}
            title={`#${index + 1} · ${process.name} (PID ${process.pid})`}
            text={process.metric}
          />
        ))
      ) : (
        <List.Item.Detail.Metadata.Label
          title="Status"
          text={{ value: "Collecting sample…", color: Color.SecondaryText }}
        />
      )}
    </>
  );
}

/** Colored percentage tag for `List.Item` accessories. */
export function percentTagAccessory(
  percent: number,
  displayMode: PercentDisplayMode = "usage",
  color?: Color | null,
): List.Item.Accessory {
  return { tag: { value: `${percent} %`, color: tagColor(percent, displayMode, color) } };
}
