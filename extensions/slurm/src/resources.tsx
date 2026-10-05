import { useEffect, useMemo, useState } from "react";
import { Action, ActionPanel, Color, Detail, Icon, List, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listNodes, type SlurmNode } from "./lib/slurm";
import { formatBytesMB, gpuCountFromGres, gpuModelFromGres } from "./lib/format";
import { useActiveHosts } from "./lib/session";
import { fetchPerCluster, type ClusterResult } from "./lib/multi";
import { ClusterAuthRow } from "./lib/components/ClusterAuthRow";
import {
  ClusterFilterDropdown,
  FILTER_ALL,
  applyClusterFilter,
  partitionsByCluster,
} from "./lib/components/ClusterFilter";
import { NoHostView } from "./lib/components/NoHostView";

type Group = {
  key: string;
  partitions: string;
  cpuTot: number;
  memMB: number;
  gres: string;
  gpuModel: string;
  gpuCount: number;
  features: string;
  nodes: SlurmNode[];
};

export default function Resources() {
  const { hosts, isLoading: hostsLoading } = useActiveHosts();
  const [filter, setFilter] = useState<string>(FILTER_ALL);

  const hostsKey = useMemo(() => JSON.stringify(hosts), [hosts]);

  const {
    data: results,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (key: string) => {
      const list = (JSON.parse(key) as string[]).filter(Boolean);
      return fetchPerCluster<SlurmNode[]>(list, (h) => listNodes(h));
    },
    [hostsKey],
    { execute: hosts.length > 0, keepPreviousData: true },
  );

  useEffect(() => {
    if (!hosts.length) return;
    const t = setInterval(() => revalidate(), 60_000);
    return () => clearInterval(t);
  }, [hostsKey, revalidate]);

  const partitionsPerCluster = useMemo(
    () => partitionsByCluster<SlurmNode>((results ?? []) as ClusterResult<SlurmNode[]>[], (n) => n.partitions),
    [results],
  );

  const filtered = useMemo(
    () => applyClusterFilter<SlurmNode>((results ?? []) as ClusterResult<SlurmNode[]>[], filter, (n) => n.partitions),
    [results, filter],
  );

  if (!hostsLoading && hosts.length === 0) return <NoHostView />;

  const allFailures = (results ?? []).filter((r) => !r.ok);
  const filteredSuccesses = filtered.filter((r) => r.ok);

  return (
    <List
      isLoading={isLoading || hostsLoading}
      navigationTitle={hosts.length ? `HPC Info — ${hosts.join(", ")}` : "HPC Info"}
      searchBarPlaceholder="Filter shapes / partitions…"
      searchBarAccessory={
        <ClusterFilterDropdown tooltip="Filter" value={filter} onChange={setFilter} clusters={partitionsPerCluster} />
      }
    >
      {allFailures.map((r) =>
        !r.ok ? <ClusterAuthRow key={`err:${r.host}`} host={r.host} info={r.error} onReauth={revalidate} /> : null,
      )}

      {filteredSuccesses.map((r) => {
        if (!r.ok) return null;
        const groups = groupNodes(r.data);
        return (
          <List.Section key={r.host} title={r.host} subtitle={`${r.data.length} nodes · ${groups.length} shapes`}>
            {groups.map((g) => (
              <GroupItem key={`${r.host}:${g.key}`} g={g} host={r.host} />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function shapeTitle(g: Group): string {
  return g.gpuCount > 0
    ? `${g.gpuCount}× ${g.gpuModel.toUpperCase() || "GPU"} · ${g.cpuTot}c · ${formatBytesMB(g.memMB)}`
    : `${g.cpuTot}c · ${formatBytesMB(g.memMB)}`;
}

function groupMarkdown(g: Group, title: string, host: string): string {
  return [
    `# ${title}`,
    "",
    `**Cluster:** \`${host}\``,
    `**Partitions:** \`${g.partitions || "—"}\``,
    `**CPUs/node:** ${g.cpuTot}`,
    `**RAM/node:** ${formatBytesMB(g.memMB)}`,
    g.gres ? `**GRES:** \`${g.gres}\`` : "",
    g.features ? `**Features:** \`${g.features}\`` : "",
    "",
    `## Nodes (${g.nodes.length})`,
    "",
    "```",
    g.nodes.map((n) => n.name).join("\n"),
    "```",
  ]
    .filter(Boolean)
    .join("\n");
}

function GroupItem({ g, host }: { g: Group; host: string }) {
  const { push } = useNavigation();
  const title = shapeTitle(g);
  const subtitle = g.partitions || "(no partition)";
  const accessories: List.Item.Accessory[] = [{ tag: { value: `${g.nodes.length}×`, color: Color.Blue } }];

  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      keywords={[host, g.partitions, g.gres, g.features, g.gpuModel]}
      icon={{ source: g.gpuCount > 0 ? Icon.ComputerChip : Icon.HardDrive, tintColor: Color.Blue }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action title="View Details" icon={Icon.Eye} onAction={() => push(<GroupDetail g={g} host={host} />)} />
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Node Names" content={g.nodes.map((n) => n.name).join(",")} />
            <Action.CopyToClipboard title="Copy Shape Description" content={title} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function GroupDetail({ g, host }: { g: Group; host: string }) {
  const title = shapeTitle(g);
  return (
    <Detail
      markdown={groupMarkdown(g, title, host)}
      navigationTitle={`${title} — ${host}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Node Names" content={g.nodes.map((n) => n.name).join(",")} />
          <Action.CopyToClipboard title="Copy Shape Description" content={title} />
        </ActionPanel>
      }
    />
  );
}

function groupNodes(nodes: SlurmNode[]): Group[] {
  const map = new Map<string, Group>();
  for (const n of nodes) {
    const partitions = [...n.partitions].sort().join(",");
    const key = JSON.stringify([partitions, n.cpuTot, n.realMemoryMB, n.gres, n.features]);
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        partitions,
        cpuTot: n.cpuTot,
        memMB: n.realMemoryMB,
        gres: n.gres,
        gpuModel: gpuModelFromGres(n.gres, n.features),
        gpuCount: gpuCountFromGres(n.gres),
        features: n.features,
        nodes: [],
      };
      map.set(key, g);
    }
    g.nodes.push(n);
  }
  return [...map.values()].sort((a, b) => {
    if (b.gpuCount !== a.gpuCount) return b.gpuCount - a.gpuCount;
    if (b.memMB !== a.memMB) return b.memMB - a.memMB;
    return b.cpuTot - a.cpuTot;
  });
}
