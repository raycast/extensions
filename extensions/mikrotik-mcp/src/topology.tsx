/**
 * Topology command — mirrors the dashboard's Topology tab: configured devices and
 * the Layer-2 neighbours discovered via MNDP/CDP/LLDP. The SVG radar map becomes
 * two Raycast sections; onboardable neighbours expose a "copy config stub" action
 * that seeds the same `suggestedConfig` the dashboard would add to the config.
 */
import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useApi, usePolling } from "./lib/hooks";
import type { TopoNode, TopologyPayload } from "./lib/types";

function nodeIcon(n: TopoNode): { source: Icon; tintColor: Color } {
  if (n.kind === "neighbor")
    return {
      source: Icon.Circle,
      tintColor: n.onboardable ? Color.Green : Color.SecondaryText,
    };
  const r = n.reachable;
  return {
    source: Icon.Dot,
    tintColor:
      r === true ? Color.Green : r === false ? Color.Red : Color.SecondaryText,
  };
}

function accessoriesFor(n: TopoNode) {
  const acc: { text?: string; tag?: { value: string; color?: Color } }[] = [];
  if (n.cpuLoad != null) acc.push({ text: `cpu ${Math.round(n.cpuLoad)}%` });
  if (n.memUsedPct != null)
    acc.push({ text: `mem ${Math.round(n.memUsedPct)}%` });
  if (n.version) acc.push({ text: n.version });
  if (n.onboardable)
    acc.push({ tag: { value: "onboard", color: Color.Green } });
  return acc;
}

export default function Command() {
  const { data, isLoading, revalidate } =
    useApi<TopologyPayload>("/api/topology");
  usePolling(revalidate, 4000);

  const nodes = data?.nodes ?? [];
  const devices = nodes.filter((n) => n.kind === "device");
  const neighbors = nodes.filter((n) => n.kind === "neighbor");

  const row = (n: TopoNode) => (
    <List.Item
      key={n.id}
      icon={nodeIcon(n)}
      title={n.label}
      subtitle={
        [n.ip, n.mac, n.board ?? n.platform].filter(Boolean).join(" · ") ||
        undefined
      }
      accessories={accessoriesFor(n)}
      actions={
        <ActionPanel>
          {n.ip ? (
            <Action.CopyToClipboard
              title="Copy IP"
              content={n.ip}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          ) : null}
          {n.mac ? (
            <Action.CopyToClipboard title="Copy MAC" content={n.mac} />
          ) : null}
          {n.onboardable && n.suggestedConfig ? (
            <Action.CopyToClipboard
              title="Copy Config Stub"
              icon={Icon.Plus}
              content={JSON.stringify(n.suggestedConfig, null, 2)}
            />
          ) : null}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        </ActionPanel>
      }
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter nodes…">
      <List.Section
        title="Devices"
        subtitle={data ? `${data.stats.devices}` : undefined}
      >
        {devices.map(row)}
      </List.Section>
      <List.Section
        title="Neighbours"
        subtitle={
          data
            ? `${data.stats.neighbors} · ${data.stats.onboardable} onboardable`
            : undefined
        }
      >
        {neighbors.map(row)}
      </List.Section>
    </List>
  );
}
