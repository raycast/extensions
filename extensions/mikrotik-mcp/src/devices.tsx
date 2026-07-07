/**
 * Devices command — mirrors the dashboard's Devices tab: per-router connectivity,
 * system-health gauges (CPU/MEM/DISK via getProgressIcon), health sparklines from
 * the probe history, the SSH connection-pool state, and an enable/disable toggle
 * (excludes a device from the MCP tool surface). Polls `/api/devices` +
 * `/api/ssh-pool` every 4 s like the dashboard.
 */
import { useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { HEALTH_COLOR, bytes, ms, num } from "./lib/format";
import { useApi, usePolling } from "./lib/hooks";
import { postJson } from "./lib/api";
import { showFailureToast } from "./lib/confirm";
import { areaChart, chartImage, gaugeRow, sparklineIcon } from "./lib/charts";
import type {
  DeviceInfo,
  DevicesPayload,
  OpResult,
  SSHPoolPayload,
} from "./lib/types";

function reachIcon(d: DeviceInfo): { source: Icon; tintColor: Color } {
  const r = d.status.reachable;
  return {
    source: Icon.Dot,
    tintColor:
      r === true ? Color.Green : r === false ? Color.Red : Color.SecondaryText,
  };
}

/** Big radial gauges + health area charts for the device detail pane. */
function deviceMarkdown(d: DeviceInfo): string {
  const s = d.status;
  const hist = d.history ?? [];
  const gauges: Array<{ pct: number; label: string; color: string }> = [];
  if (s.cpuLoad != null)
    gauges.push({
      pct: s.cpuLoad,
      label: "CPU",
      color: healthColorHex(s.cpuLoad),
    });
  if (s.memUsedPct != null)
    gauges.push({
      pct: s.memUsedPct,
      label: "MEM",
      color: healthColorHex(s.memUsedPct),
    });
  if (s.hddUsedPct != null)
    gauges.push({
      pct: s.hddUsedPct,
      label: "DISK",
      color: healthColorHex(s.hddUsedPct),
    });

  const parts = [`# ${d.name}`];
  if (gauges.length) parts.push(`\n${chartImage(gaugeRow(gauges), "gauges")}`);
  if (hist.length > 1) {
    parts.push(
      `\n${chartImage(
        areaChart(
          hist.map((h) => h.cpuLoad ?? null),
          { label: "CPU load", unit: "%", color: HEALTH_COLOR.cpu },
        ),
        "cpu",
      )}`,
    );
    parts.push(
      `\n${chartImage(
        areaChart(
          hist.map((h) => h.memUsedPct ?? null),
          { label: "Memory used", unit: "%", color: HEALTH_COLOR.mem },
        ),
        "mem",
      )}`,
    );
    parts.push(
      `\n${chartImage(
        areaChart(
          hist.map((h) => h.latencyMs ?? null),
          { label: "Probe latency", unit: "ms", color: HEALTH_COLOR.latency },
        ),
        "lat",
      )}`,
    );
  }
  return parts.join("\n");
}

function healthColorHex(pct: number): string {
  return pct >= 85 ? "#f0616d" : pct >= 60 ? "#f5c542" : "#34d399";
}

/** A tiny CPU-load sparkline accessory (collapsed rows), or nothing if no history. */
function healthSparkAccessory(
  d: DeviceInfo,
): Array<{ icon: string; tooltip: string }> {
  const hist = d.history ?? [];
  if (hist.length < 2) return [];
  const icon = sparklineIcon(
    hist.map((h) => h.cpuLoad ?? null),
    HEALTH_COLOR.cpu,
  );
  return icon ? [{ icon, tooltip: "CPU load" }] : [];
}

function DeviceMetadata({
  d,
  pool,
}: {
  d: DeviceInfo;
  pool: SSHPoolPayload | undefined;
}) {
  const s = d.status;
  const poolDev = pool?.devices.find((p) => p.device === d.name);

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="Status"
        text={
          s.reachable === true
            ? `online · ${ms(s.latencyMs ?? 0)}`
            : s.reachable === false
              ? `offline${s.error ? ` · ${s.error}` : ""}`
              : "checking…"
        }
        icon={reachIcon(d)}
      />
      {s.identity ? (
        <List.Item.Detail.Metadata.Label title="Identity" text={s.identity} />
      ) : null}
      {s.version ? (
        <List.Item.Detail.Metadata.Label title="RouterOS" text={s.version} />
      ) : null}
      <List.Item.Detail.Metadata.Label
        title="Address"
        text={d.address ?? `${d.host}:${d.port}`}
      />
      <List.Item.Detail.Metadata.Label
        title="Transport"
        text={d.transport ?? (d.mac ? "mac-telnet" : "ssh")}
      />
      {d.jumpVia || d.jumpHost ? (
        <List.Item.Detail.Metadata.Label
          title="Via bastion"
          text={d.jumpVia ?? `${d.jumpHost?.host}:${d.jumpHost?.port}`}
          icon={Icon.Lock}
        />
      ) : null}
      <List.Item.Detail.Metadata.Separator />
      {s.boardName ? (
        <List.Item.Detail.Metadata.Label title="Board" text={s.boardName} />
      ) : null}
      {s.architecture ? (
        <List.Item.Detail.Metadata.Label
          title="Arch"
          text={`${s.architecture}${s.cpuCount ? ` · ${s.cpuCount} cores` : ""}`}
        />
      ) : null}
      {s.uptime ? (
        <List.Item.Detail.Metadata.Label title="Uptime" text={s.uptime} />
      ) : null}
      {s.totalMemory ? (
        <List.Item.Detail.Metadata.Label
          title="RAM"
          text={`${bytes((s.totalMemory ?? 0) - (s.freeMemory ?? 0))} / ${bytes(s.totalMemory)}`}
        />
      ) : null}
      {s.freeHdd != null ? (
        <List.Item.Detail.Metadata.Label
          title="Free disk"
          text={bytes(s.freeHdd)}
        />
      ) : null}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title="Activity"
        text={`${num(d.activity.calls)} calls · ${d.activity.errors} err · avg ${ms(d.activity.avgMs)}`}
      />
      {poolDev ? (
        <List.Item.Detail.Metadata.Label
          title="SSH pool"
          text={
            poolDev.dead
              ? "reconnecting"
              : poolDev.inflight > 0
                ? `${poolDev.inflight} inflight`
                : poolDev.idle
                  ? "idle"
                  : "—"
          }
        />
      ) : null}
      {d.description ? (
        <List.Item.Detail.Metadata.Label title="Notes" text={d.description} />
      ) : null}
    </List.Item.Detail.Metadata>
  );
}

export default function Command() {
  const [showDetail, setShowDetail] = useState(true);
  const { data, isLoading, revalidate } =
    useApi<DevicesPayload>("/api/devices");
  const { data: pool } = useApi<SSHPoolPayload>("/api/ssh-pool");
  usePolling(revalidate, 4000);

  async function toggle(d: DeviceInfo) {
    const verb = d.disabled ? "Enable" : "Disable";
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${verb} ${d.name}…`,
    });
    try {
      const res = await postJson<OpResult>("/api/devices/toggle", {
        device: d.name,
        disabled: !d.disabled,
      });
      if (res.error) throw new Error(res.error);
      toast.style = Toast.Style.Success;
      toast.title = `${d.name} ${d.disabled ? "enabled" : "disabled"}`;
      if (res.requiresReconnect)
        toast.message = "Reconnect the MCP client to apply";
      else if (res.warning) toast.message = res.warning;
      revalidate();
    } catch (e) {
      toast.hide();
      await showFailureToast(e, {
        title: `Could not ${verb.toLowerCase()} ${d.name}`,
      });
    }
  }

  const devices = data?.devices ?? [];

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      searchBarPlaceholder="Filter devices…"
    >
      <List.Section
        title="Devices"
        subtitle={
          pool?.enabled
            ? `pool: ${pool.aggregate.totalBusy} busy / ${pool.aggregate.totalConnections} conns`
            : undefined
        }
      >
        {devices.map((d) => (
          <List.Item
            key={d.name}
            icon={reachIcon(d)}
            title={d.name}
            subtitle={
              showDetail ? undefined : (d.address ?? `${d.host}:${d.port}`)
            }
            accessories={
              showDetail
                ? undefined
                : [
                    ...(d.isDefault
                      ? [{ tag: { value: "default", color: Color.Blue } }]
                      : []),
                    ...(d.disabled
                      ? [
                          {
                            tag: {
                              value: "disabled",
                              color: Color.SecondaryText,
                            },
                          },
                        ]
                      : []),
                    ...(d.status.version ? [{ text: d.status.version }] : []),
                    ...healthSparkAccessory(d),
                    ...(d.status.latencyMs != null
                      ? [{ text: ms(d.status.latencyMs) }]
                      : []),
                  ]
            }
            detail={
              <List.Item.Detail
                markdown={deviceMarkdown(d)}
                metadata={<DeviceMetadata d={d} pool={pool} />}
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title={showDetail ? "Hide Details" : "Show Details"}
                  icon={Icon.Sidebar}
                  onAction={() => setShowDetail((v) => !v)}
                />
                <Action
                  title={d.disabled ? "Enable Device" : "Disable Device"}
                  icon={d.disabled ? Icon.Power : Icon.Plug}
                  onAction={() => toggle(d)}
                />
                <Action.CopyToClipboard
                  title="Copy Address"
                  content={d.address ?? `${d.host}:${d.port}`}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
