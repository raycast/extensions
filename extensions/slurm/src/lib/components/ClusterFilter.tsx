import { List } from "@raycast/api";
import type { ClusterResult } from "../multi";

export const FILTER_ALL = "all";
export const FILTER_MINE = "mine";

export function filterIsAll(f: string): boolean {
  return f === FILTER_ALL;
}

export function filterIsMine(f: string): boolean {
  return f === FILTER_MINE;
}

/** Parse the encoded filter value. Returns null if not a cluster filter. */
export function parseClusterFilter(f: string): { host: string; partition?: string } | null {
  if (!f.startsWith("cluster:")) return null;
  const rest = f.slice("cluster:".length);
  const idx = rest.indexOf(":");
  if (idx < 0) return { host: rest };
  return { host: rest.slice(0, idx), partition: rest.slice(idx + 1) };
}

export function encodeClusterFilter(host: string, partition?: string): string {
  return partition ? `cluster:${host}:${partition}` : `cluster:${host}`;
}

/**
 * Build the hierarchical dropdown: "All clusters", optional "My jobs only",
 * then one section per cluster with "All on <host>" + each partition.
 */
export function ClusterFilterDropdown({
  value,
  onChange,
  tooltip,
  clusters,
  includeMine,
}: {
  value: string;
  onChange: (v: string) => void;
  tooltip: string;
  /** Per-cluster partition lists, in display order. */
  clusters: { host: string; partitions: string[] }[];
  includeMine?: boolean;
}) {
  return (
    <List.Dropdown tooltip={tooltip} value={value} onChange={onChange}>
      <List.Dropdown.Item title="All clusters · all partitions" value={FILTER_ALL} />
      {includeMine ? <List.Dropdown.Item title="My jobs only (all clusters)" value={FILTER_MINE} /> : null}
      {clusters.map(({ host, partitions }) => (
        <List.Dropdown.Section key={host} title={host}>
          <List.Dropdown.Item title={`All on ${host}`} value={encodeClusterFilter(host)} />
          {partitions.map((p) => (
            <List.Dropdown.Item key={`${host}:${p}`} title={`${host} · ${p}`} value={encodeClusterFilter(host, p)} />
          ))}
        </List.Dropdown.Section>
      ))}
    </List.Dropdown>
  );
}

/**
 * Apply the encoded filter to per-cluster results. `getPartition` is called
 * per item; pass `isMine` to implement the "My jobs only" mode on pages where
 * that's meaningful.
 */
export function applyClusterFilter<T>(
  results: ClusterResult<T[]>[],
  filter: string,
  getPartition: (item: T) => string | string[],
  isMine?: (host: string, item: T) => boolean,
): ClusterResult<T[]>[] {
  if (filterIsAll(filter)) return results;
  if (filterIsMine(filter)) {
    if (!isMine) return results;
    return results.map((r) => (r.ok ? { ...r, data: r.data.filter((x) => isMine(r.host, x)) } : r));
  }
  const parsed = parseClusterFilter(filter);
  if (!parsed) return results;
  return results
    .filter((r) => r.host === parsed.host)
    .map((r) => {
      if (!r.ok || !parsed.partition) return r;
      const targetPartition = parsed.partition;
      return {
        ...r,
        data: r.data.filter((x) => {
          const p = getPartition(x);
          return Array.isArray(p) ? p.includes(targetPartition) : p === targetPartition;
        }),
      };
    });
}

/** Build a per-cluster partition list, sorted alphabetically. */
export function partitionsByCluster<T>(
  results: ClusterResult<T[]>[],
  getPartition: (item: T) => string | string[],
): { host: string; partitions: string[] }[] {
  return results.map((r) => {
    if (!r.ok) return { host: r.host, partitions: [] };
    const set = new Set<string>();
    for (const item of r.data) {
      const p = getPartition(item);
      if (Array.isArray(p)) p.forEach((x) => x && set.add(x));
      else if (p) set.add(p);
    }
    return { host: r.host, partitions: [...set].sort() };
  });
}
