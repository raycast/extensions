import { environment } from "@raycast/api";
import { getSchedulePalette, SchedulePalette } from "@/common/colors";
import { MonitorAvailabilityPeriod } from "@/domain/monitor-sla";
import { formatDuration } from "@/common/utils/date-utils";
import { renderToSvg } from "@/ui/svg-renderer";
import { MonitorTable } from "@/ui/monitors/components/monitor-table";

const COLUMNS = [
  { title: "Time Period", width: 304 },
  { title: "Availability", width: 159 },
  { title: "Downtime", width: 148 },
  { title: "Incidents", width: 138 },
  { title: "Longest incident", width: 227 },
  { title: "Avg. incident", width: 184 },
];

const SKELETON_BAR_WIDTHS = [72, 56, 24, 64, 72];

export async function buildMonitorAvailabilityTableSvg(periods: MonitorAvailabilityPeriod[]): Promise<string> {
  return renderToSvg(<MonitorTable columns={COLUMNS} rows={periods.map(toCells)} />);
}

/**
 * Same frame as the loaded table, with the period labels already in place and bars where
 * the numbers will go, so nothing moves when the data arrives.
 */
export async function buildMonitorAvailabilitySkeletonSvg(labels: string[]): Promise<string> {
  const palette = getSchedulePalette(environment.appearance);
  const rows = labels.map((label) => [label, ...SKELETON_BAR_WIDTHS.map((width) => skeletonBar(width, palette))]);
  return renderToSvg(<MonitorTable columns={COLUMNS} rows={rows} />);
}

function skeletonBar(width: number, palette: SchedulePalette) {
  return <div tw={`flex w-[${width}px] h-[16px] rounded-[4px] bg-[${palette.skeletonBar}]`} />;
}

function toCells({ label, sla }: MonitorAvailabilityPeriod): string[] {
  return [
    label,
    formatAvailability(sla.availability),
    formatDuration(sla.totalDowntime),
    `${sla.numberOfIncidents}`,
    formatDuration(sla.longestIncident),
    formatDuration(sla.averageIncident),
  ];
}

function formatAvailability(percentage: number): string {
  return `${parseFloat(percentage.toFixed(3))}%`;
}
