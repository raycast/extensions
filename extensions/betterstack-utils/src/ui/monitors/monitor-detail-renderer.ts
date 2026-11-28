import { environment } from "@raycast/api";
import { DateTime } from "luxon";
import { Monitor } from "@/domain/monitor";
import { MonitorAvailabilityPeriod } from "@/domain/monitor-sla";
import { capitalize } from "@/common/utils/string-utils";
import { stripProtocol } from "@/common/utils/url-utils";
import { Optional } from "@/common/utils/optional-utils";
import { formatDuration } from "@/common/utils/date-utils";
import { isNotEmpty } from "@/common/utils/collection-utils";
import { buildAvailabilityWindows } from "@/api/betterstack-monitor-sla-api";
import { buildBlankSvg, toImageDataUri, toSvgDataUri } from "@/common/utils/svg-utils";
import {
  buildMonitorAvailabilitySkeletonSvg,
  buildMonitorAvailabilityTableSvg,
} from "@/ui/monitors/components/monitor-availability-table";
import { buildMonitorDetailsTableSvg } from "@/ui/monitors/components/monitor-details-table";
import { getMonitorTableHeight } from "@/ui/monitors/components/monitor-table";
import { buildMonitorStatusHeaderSvg } from "@/ui/monitors/components/monitor-status-header";
import { VIEWPORT_WIDTH } from "@/ui/svg-renderer";

export interface AvailabilityState {
  periods: MonitorAvailabilityPeriod[];
  isLoading: boolean;
  isError: boolean;
}

/** The images the detail page needs on its first frame, rendered before it opens. */
export interface MonitorDetailImages {
  headerMarkdown: string;
  availabilitySkeletonMarkdown: string;
  detailsMarkdown: Optional<string>;
}

const renderedImages = new Map<string, Promise<string>>();

/**
 * Renders the status header, the availability skeleton and the details table ahead of time, so
 * the detail page opens with the pulse and the table frames already in place instead of fading
 * them in. Results are cached, so calling this when a monitor is selected makes opening its
 * detail instant.
 */
export async function prerenderMonitorDetailImages(monitor: Monitor): Promise<MonitorDetailImages> {
  const [headerMarkdown, availabilitySkeletonMarkdown, detailsMarkdown] = await Promise.all([
    renderMonitorHeader(monitor),
    renderMonitorAvailabilitySkeleton(monitor),
    renderMonitorDetails(monitor),
  ]);
  return { headerMarkdown, availabilitySkeletonMarkdown, detailsMarkdown };
}

export function buildMonitorDetailMarkdown(
  monitor: Monitor,
  images: Omit<MonitorDetailImages, "availabilitySkeletonMarkdown">,
  availabilityMarkdown: string,
): string {
  return [
    images.headerMarkdown,
    buildUrlLine(monitor),
    `### Availability\n\n${availabilityMarkdown}`,
    images.detailsMarkdown && `### Details\n\n${images.detailsMarkdown}`,
  ]
    .filter((section) => section !== undefined && section !== "")
    .join("\n\n");
}

/**
 * Renders the availability table as an image rather than a markdown table: Raycast sizes
 * markdown columns by their content, so the columns would shift once the numbers load.
 */
export async function renderMonitorAvailability(monitor: Monitor, availability: AvailabilityState): Promise<string> {
  if (availability.isError) return "_Failed to load availability data._";

  if (availability.periods.length === 0) {
    if (!availability.isLoading) return "_No availability data._";

    return renderMonitorAvailabilitySkeleton(monitor);
  }

  return toImage("availability", await buildMonitorAvailabilityTableSvg(availability.periods));
}

function renderMonitorHeader(monitor: Monitor): Promise<string> {
  const cacheKey = ["header", environment.appearance, monitor.name, monitor.status].join(":");
  return renderOnce(cacheKey, async () => toImage("status", await buildMonitorStatusHeaderSvg(monitor))).catch(
    () => `## ${monitor.name}`,
  );
}

function renderMonitorAvailabilitySkeleton(monitor: Monitor): Promise<string> {
  const labels = getAvailabilityLabels(monitor);
  const cacheKey = ["skeleton", environment.appearance, ...labels].join(":");
  return renderOnce(cacheKey, async () =>
    toImage("availability", await buildMonitorAvailabilitySkeletonSvg(labels)),
  ).catch(() => toBlankImage("availability", getMonitorTableHeight(labels.length)));
}

/**
 * Renders the details table as an image so its text matches the availability table, which
 * markdown tables can't do: Raycast draws them at its own, larger font size.
 */
async function renderMonitorDetails(monitor: Monitor): Promise<Optional<string>> {
  const rows = buildDetailsRows(monitor);
  if (rows.length === 0) return undefined;

  const cacheKey = ["details", environment.appearance, ...rows.flat()].join(":");
  return renderOnce(cacheKey, async () => toImage("details", await buildMonitorDetailsTableSvg(rows))).catch(() =>
    buildDetailsMarkdownTable(rows),
  );
}

/** Failed renders are dropped from the cache so the next call retries them. */
function renderOnce(cacheKey: string, render: () => Promise<string>): Promise<string> {
  const cached = renderedImages.get(cacheKey);
  if (cached) return cached;

  const rendering = render();
  renderedImages.set(cacheKey, rendering);
  rendering.catch(() => renderedImages.delete(cacheKey));
  return rendering;
}

async function toImage(altText: string, svg: string): Promise<string> {
  return `![${altText}](${await toImageDataUri(svg, environment.supportPath, environment.raycastVersion)})`;
}

function toBlankImage(altText: string, height: number): string {
  return `![${altText}](${toSvgDataUri(buildBlankSvg(VIEWPORT_WIDTH, height))})`;
}

/** Monitors without a display name are named after their URL, which the header already shows. */
function buildUrlLine(monitor: Monitor): Optional<string> {
  const url = stripProtocol(monitor.url);
  return url === stripProtocol(monitor.name) ? undefined : url;
}

function getAvailabilityLabels(monitor: Monitor): string[] {
  return buildAvailabilityWindows(DateTime.now(), monitor.createdAt).map((window) => window.label);
}

function buildDetailsRows(monitor: Monitor): [string, string][] {
  const rows: [string, string][] = [];

  if (monitor.monitorType) rows.push(["Type", capitalize(monitor.monitorType)]);
  if (monitor.httpMethod) rows.push(["Method", monitor.httpMethod.toUpperCase()]);
  if (monitor.checkFrequency) rows.push(["Check frequency", formatDuration(monitor.checkFrequency)]);
  if (monitor.requestTimeout) rows.push(["Request timeout", formatDuration(monitor.requestTimeout)]);
  if (monitor.recoveryPeriod) rows.push(["Recovery period", formatDuration(monitor.recoveryPeriod)]);
  if (monitor.lastCheckedAt) rows.push(["Last checked", formatLastChecked(monitor.lastCheckedAt)]);
  if (isNotEmpty(monitor.regions)) rows.push(["Regions", monitor.regions.join(", ").toUpperCase()]);
  if (monitor.sslExpiration) rows.push(["SSL expiration", formatDays(monitor.sslExpiration)]);
  if (monitor.domainExpiration) rows.push(["Domain expiration", formatDays(monitor.domainExpiration)]);

  return rows;
}

function buildDetailsMarkdownTable(rows: [string, string][]): string {
  return ["| Field | Value |", "| --- | --- |", ...rows.map(([field, value]) => `| ${field} | ${value} |`)].join("\n");
}

function formatDays(days: number): string {
  return `${days} ${days === 1 ? "day" : "days"}`;
}

function formatLastChecked(lastCheckedAt: Optional<string>): string {
  if (!lastCheckedAt) return "Never";
  return DateTime.fromISO(lastCheckedAt).toLocaleString(DateTime.DATETIME_MED);
}
