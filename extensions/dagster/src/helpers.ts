import { Color, Icon } from "@raycast/api";
import { Materialization, AssetGraphNode } from "./api";

// Metadata labels that represent a duration in seconds.
// Add more entries here if needed.
const DURATION_LABELS = ["Execution time (s)"];

export function formatTimestamp(ts: number | string | null, ms = false): string {
  if (ts === null || ts === undefined) return "";
  const num = typeof ts === "string" ? parseInt(ts, 10) : ts;
  if (isNaN(num)) return "";
  const date = new Date(ms ? num : num * 1000);
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${d} ${h}:${mi}`;
}

export function materializationDuration(mat: Materialization): number | null {
  // Look for a metadata entry whose label matches a known duration metric
  for (const entry of mat.metadataEntries) {
    if (
      DURATION_LABELS.includes(entry.label) &&
      entry.__typename === "FloatMetadataEntry" &&
      entry.floatValue != null
    ) {
      return entry.floatValue;
    }
  }
  // Fall back to stepStats delta
  if (mat.stepStats?.startTime && mat.stepStats?.endTime) {
    return mat.stepStats.endTime - mat.stepStats.startTime;
  }
  return null;
}

export function formatNumber(v: number | null): string {
  if (v === null || v === undefined) return "";
  if (Number.isInteger(v)) return String(v);
  if (Math.abs(v) >= 100) return v.toFixed(1);
  return v.toFixed(2);
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "";
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toFixed(0)}s`;
}

export function statusIcon(status: string): Icon {
  switch (status) {
    case "SUCCESS":
      return Icon.CheckCircle;
    case "STARTED":
    case "STARTING":
      return Icon.CircleProgress;
    case "QUEUED":
    case "NOT_STARTED":
      return Icon.Clock;
    case "CANCELING":
    case "CANCELED":
      return Icon.MinusCircle;
    default:
      return Icon.XMarkCircle;
  }
}

export function statusColor(status: string): Color {
  switch (status) {
    case "SUCCESS":
      return Color.Green;
    case "STARTED":
    case "STARTING":
      return Color.Blue;
    case "QUEUED":
    case "NOT_STARTED":
      return Color.SecondaryText;
    case "CANCELING":
    case "CANCELED":
      return Color.Orange;
    default:
      return Color.Red;
  }
}

// --- Asset graph traversal ---

export type MaterializeScope = "this" | "upstream" | "downstream" | "upstream+downstream";

export function assetKeyStr(path: string[]): string {
  return path.join("/");
}

export function resolveAssetSelection(
  startPath: string[],
  scope: MaterializeScope,
  graphIndex: Map<string, AssetGraphNode>,
): AssetGraphNode[] {
  const startKey = assetKeyStr(startPath);
  const visited = new Set<string>([startKey]);
  const upQueue: string[] = [];
  const downQueue: string[] = [];

  if (scope === "upstream" || scope === "upstream+downstream") upQueue.push(startKey);
  if (scope === "downstream" || scope === "upstream+downstream") downQueue.push(startKey);

  while (upQueue.length > 0) {
    const key = upQueue.shift()!;
    const node = graphIndex.get(key);
    if (!node) continue;
    for (const dep of node.dependencyKeys) {
      const depKey = assetKeyStr(dep.path);
      if (!visited.has(depKey)) {
        visited.add(depKey);
        upQueue.push(depKey);
      }
    }
  }

  while (downQueue.length > 0) {
    const key = downQueue.shift()!;
    const node = graphIndex.get(key);
    if (!node) continue;
    for (const dep of node.dependedByKeys) {
      const depKey = assetKeyStr(dep.path);
      if (!visited.has(depKey)) {
        visited.add(depKey);
        downQueue.push(depKey);
      }
    }
  }

  return Array.from(visited)
    .map((k) => graphIndex.get(k))
    .filter((n): n is AssetGraphNode => n !== undefined && n.isMaterializable && !n.isPartitioned);
}

export function buildGraphIndex(nodes: AssetGraphNode[]): Map<string, AssetGraphNode> {
  const index = new Map<string, AssetGraphNode>();
  for (const node of nodes) {
    index.set(assetKeyStr(node.assetKey.path), node);
  }
  return index;
}

export interface JobGroup {
  jobName: string;
  repositoryName: string;
  locationName: string;
  assetKeys: { path: string[] }[];
}

export function groupByJob(nodes: AssetGraphNode[]): JobGroup[] {
  const groups = new Map<string, JobGroup>();
  for (const node of nodes) {
    const job = node.jobs[0];
    if (!job) continue;
    const key = `${job.repository.location.name}/${job.repository.name}/${job.name}`;
    const group = groups.get(key);
    if (group) {
      group.assetKeys.push({ path: node.assetKey.path });
    } else {
      groups.set(key, {
        jobName: job.name,
        repositoryName: job.repository.name,
        locationName: job.repository.location.name,
        assetKeys: [{ path: node.assetKey.path }],
      });
    }
  }
  return Array.from(groups.values());
}

export function numericMetadataLabels(materializations: Materialization[]): string[] {
  const labels = new Set<string>();
  for (const mat of materializations) {
    for (const entry of mat.metadataEntries) {
      if (
        (entry.__typename === "FloatMetadataEntry" && entry.floatValue != null) ||
        (entry.__typename === "IntMetadataEntry" && entry.intValue != null)
      ) {
        labels.add(entry.label);
      }
    }
  }
  return Array.from(labels);
}

const STRING_TYPES = new Set(["TextMetadataEntry", "PathMetadataEntry", "UrlMetadataEntry", "BoolMetadataEntry"]);

export function stringMetadataLabels(materializations: Materialization[]): string[] {
  const labels = new Set<string>();
  for (const mat of materializations) {
    for (const entry of mat.metadataEntries) {
      if (STRING_TYPES.has(entry.__typename)) {
        labels.add(entry.label);
      }
    }
  }
  return Array.from(labels);
}

export function metadataStringValue(mat: Materialization, label: string): string | null {
  for (const entry of mat.metadataEntries) {
    if (entry.label === label) {
      if (entry.text != null) return entry.text;
      if (entry.path != null) return entry.path;
      if (entry.url != null) return entry.url;
      if (entry.boolValue != null) return String(entry.boolValue);
    }
  }
  return null;
}

export function metadataValue(mat: Materialization, label: string): number | null {
  for (const entry of mat.metadataEntries) {
    if (entry.label === label) {
      if (entry.__typename === "FloatMetadataEntry" && entry.floatValue != null) {
        return entry.floatValue;
      }
      if (entry.__typename === "IntMetadataEntry" && entry.intValue != null) {
        return entry.intValue;
      }
    }
  }
  return null;
}
