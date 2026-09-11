import { useEffect, useMemo, useState } from "react";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listJobs, listNodes, type Job, type SlurmNode } from "./lib/slurm";
import { formatBytesMB, formatPercent, gpuCountFromGres, gpuCountFromTres } from "./lib/format";
import { useActiveHosts, useSlurmUsers } from "./lib/session";
import { fetchPerCluster, type ClusterResult } from "./lib/multi";
import { matchesQuery } from "./lib/search";
import { ClusterAuthRow } from "./lib/components/ClusterAuthRow";
import {
  ClusterFilterDropdown,
  FILTER_ALL,
  applyClusterFilter,
  partitionsByCluster,
} from "./lib/components/ClusterFilter";
import { NoHostView } from "./lib/components/NoHostView";

// A large cluster can expose thousands of nodes. Render in bounded pages so the
// List.Item tree can't exhaust the Raycast worker heap.
const PAGE_SIZE = 100;

export default function NodeUtilization() {
  const { hosts, isLoading: hostsLoading } = useActiveHosts();
  const { users } = useSlurmUsers(hosts);
  const [filter, setFilter] = useState<string>(FILTER_ALL);
  const [searchText, setSearchText] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const hostsKey = useMemo(() => JSON.stringify(hosts), [hosts]);
  const usersKey = useMemo(() => JSON.stringify(hosts.map((h) => [h, users[h] ?? ""])), [hosts, users]);

  const {
    data: nodeResults,
    isLoading: nodesLoading,
    revalidate: revalidateNodes,
  } = useCachedPromise(
    async (key: string) => {
      const list = (JSON.parse(key) as string[]).filter(Boolean);
      return fetchPerCluster<SlurmNode[]>(list, (h) => listNodes(h));
    },
    [hostsKey],
    { execute: hosts.length > 0, keepPreviousData: true },
  );

  const { data: jobResults } = useCachedPromise(
    async (key: string) => {
      const pairs = JSON.parse(key) as Array<[string, string]>;
      const list = pairs.map(([h]) => h).filter((h) => h && !!users[h]);
      return fetchPerCluster<Job[]>(list, (h) => listJobs(h, users[h] ?? ""));
    },
    [usersKey],
    {
      execute: hosts.length > 0 && hosts.some((h) => !!users[h]),
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    if (!hosts.length) return;
    const t = setInterval(() => revalidateNodes(), 30_000);
    return () => clearInterval(t);
  }, [hostsKey, revalidateNodes]);

  // Per-cluster set of nodes the user has running jobs on.
  const myNodeSets = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const r of jobResults ?? []) {
      if (!r.ok) continue;
      map[r.host] = buildNodeSet(r.data);
    }
    return map;
  }, [jobResults]);

  const partitionsPerCluster = useMemo(
    () => partitionsByCluster<SlurmNode>((nodeResults ?? []) as ClusterResult<SlurmNode[]>[], (n) => n.partitions),
    [nodeResults],
  );

  const filtered = useMemo(
    () =>
      applyClusterFilter<SlurmNode>(
        (nodeResults ?? []) as ClusterResult<SlurmNode[]>[],
        filter,
        (n) => n.partitions,
        (host, n) => myNodeSets[host]?.has(n.name) ?? false,
      ),
    [nodeResults, filter, myNodeSets],
  );

  // Reset to the first page whenever the dataset, filter, or search changes.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [hostsKey, filter, searchText]);

  if (!hostsLoading && hosts.length === 0) return <NoHostView />;

  const allFailures = (nodeResults ?? []).filter((r) => !r.ok);
  const okClusters = filtered.filter((r): r is Extract<ClusterResult<SlurmNode[]>, { ok: true }> => r.ok);

  // We filter the full in-memory dataset ourselves (List filtering disabled) so
  // search spans every node, not just the currently-paginated rows. Flatten the
  // matches in cluster order, then slice to the visible page and regroup into
  // sections — this bounds how many List.Items exist in the tree at once.
  const flat: { host: string; node: SlurmNode }[] = [];
  const matchesPerHost = new Map<string, number>();
  for (const r of okClusters) {
    for (const node of r.data) {
      if (!matchesQuery(nodeHaystack(r.host, node), searchText)) continue;
      flat.push({ host: r.host, node });
      matchesPerHost.set(r.host, (matchesPerHost.get(r.host) ?? 0) + 1);
    }
  }
  const totalNodes = flat.length;
  const shownByHost = new Map<string, SlurmNode[]>();
  for (const { host, node } of flat.slice(0, visibleCount)) {
    const arr = shownByHost.get(host);
    if (arr) arr.push(node);
    else shownByHost.set(host, [node]);
  }

  return (
    <List
      isLoading={nodesLoading || hostsLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle={hosts.length ? `HPC Util — ${hosts.join(", ")}` : "HPC Util"}
      searchBarPlaceholder="Filter nodes…"
      pagination={{
        pageSize: PAGE_SIZE,
        hasMore: visibleCount < totalNodes,
        onLoadMore: () => setVisibleCount((c) => c + PAGE_SIZE),
      }}
      searchBarAccessory={
        <ClusterFilterDropdown
          tooltip="Filter"
          value={filter}
          onChange={setFilter}
          clusters={partitionsPerCluster}
          includeMine
        />
      }
    >
      {allFailures.map((r) =>
        !r.ok ? <ClusterAuthRow key={`err:${r.host}`} host={r.host} info={r.error} onReauth={revalidateNodes} /> : null,
      )}

      {totalNodes === 0 && allFailures.length === 0 && !nodesLoading ? (
        <List.EmptyView title="No nodes match this filter" icon={Icon.MagnifyingGlass} />
      ) : null}

      {okClusters.map((r) => {
        const nodes = shownByHost.get(r.host);
        if (!nodes || nodes.length === 0) return null;
        return (
          <List.Section key={r.host} title={r.host} subtitle={`${matchesPerHost.get(r.host) ?? 0} nodes`}>
            {nodes.map((n) => (
              <NodeRow
                key={`${r.host}:${n.name}`}
                n={n}
                host={r.host}
                myJobs={myNodeSets[r.host]?.has(n.name) ?? false}
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function NodeRow({ n, host, myJobs }: { n: SlurmNode; host: string; myJobs: boolean }) {
  const usedMem = Math.max(0, n.realMemoryMB - n.freeMemoryMB);
  const cpuRatio = n.cpuLoad != null && n.cpuTot ? n.cpuLoad / n.cpuTot : null;
  const cpuColor =
    cpuRatio == null ? Color.SecondaryText : cpuRatio > 1.0 ? Color.Red : cpuRatio > 0.7 ? Color.Orange : Color.Green;
  const stateColor = nodeStateColor(n.state);
  const gpuTotal = gpuCountFromGres(n.gres);
  const gpuAlloc = gpuCountFromTres(n.allocTres) || gpuCountFromGres(n.gresUsed);

  const accessories: List.Item.Accessory[] = [
    { tag: { value: shortState(n.state), color: stateColor } },
    {
      tag: {
        value: n.cpuLoad != null ? `cpu ${n.cpuLoad.toFixed(2)}/${n.cpuTot}` : `cpu —/${n.cpuTot}`,
        color: cpuColor,
      },
    },
    {
      tag: {
        value: `mem ${formatBytesMB(usedMem)}/${formatBytesMB(n.realMemoryMB)} (${formatPercent(usedMem, n.realMemoryMB)})`,
        color: usedMem / Math.max(1, n.realMemoryMB) > 0.85 ? Color.Red : Color.Blue,
      },
    },
  ];
  if (gpuTotal) {
    accessories.push({
      tag: {
        value: `gpu ${gpuAlloc}/${gpuTotal}`,
        color: gpuAlloc >= gpuTotal ? Color.Red : gpuAlloc > 0 ? Color.Orange : Color.Green,
      },
    });
  }
  if (myJobs) {
    accessories.push({ icon: { source: Icon.Person, tintColor: Color.Yellow } });
  }

  return (
    <List.Item
      title={n.name}
      subtitle={n.partitions.join(",")}
      icon={{ source: Icon.Circle, tintColor: stateColor }}
      keywords={[host, n.state, ...n.partitions, n.features]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Node Name" content={n.name} />
          {n.reason ? <Action.CopyToClipboard title="Copy Reason" content={n.reason} /> : null}
        </ActionPanel>
      }
    />
  );
}

// Fields the search bar matches against — mirrors the old List.Item `keywords`
// plus the node name (Raycast's built-in search used to cover the title).
function nodeHaystack(host: string, n: SlurmNode): string {
  return [host, n.name, n.state, ...n.partitions, n.features].join(" ");
}

function shortState(state: string): string {
  // scontrol returns "MIXED+DRAIN" etc. Take the leading flag.
  return state.split("+")[0].split(",")[0];
}

function nodeStateColor(state: string): Color {
  const s = state.toLowerCase();
  if (s.includes("down") || s.includes("drain") || s.includes("fail")) return Color.Red;
  if (s.includes("alloc")) return Color.Blue;
  if (s.includes("mix")) return Color.Purple;
  if (s.includes("idle")) return Color.Green;
  if (s.includes("reserved") || s.includes("maint")) return Color.Orange;
  return Color.SecondaryText;
}

function buildNodeSet(jobs: Job[]): Set<string> {
  const set = new Set<string>();
  for (const j of jobs) {
    if (j.state !== "RUNNING") continue;
    for (const n of expandHostlist(j.reasonOrNodeList)) set.add(n);
  }
  return set;
}

function expandHostlist(hl: string): string[] {
  if (!hl) return [];
  const out: string[] = [];
  for (const piece of splitTopLevel(hl, ",")) {
    const trimmed = piece.trim();
    if (!trimmed) continue;
    const m = /^([^[]*)\[([^\]]+)\](.*)$/.exec(trimmed);
    if (!m) {
      out.push(trimmed);
      continue;
    }
    const [, prefix, ranges, suffix] = m;
    for (const r of ranges.split(",")) {
      const rm = /^(\d+)(?:-(\d+))?$/.exec(r.trim());
      if (!rm) continue;
      const start = Number(rm[1]);
      const end = rm[2] ? Number(rm[2]) : start;
      const width = rm[1].length;
      for (let i = start; i <= end; i++) {
        out.push(`${prefix}${String(i).padStart(width, "0")}${suffix}`);
      }
    }
  }
  return out;
}

function splitTopLevel(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "[") depth++;
    else if (c === "]") depth--;
    else if (c === sep && depth === 0) {
      out.push(s.slice(start, i));
      start = i + 1;
    }
  }
  out.push(s.slice(start));
  return out;
}
