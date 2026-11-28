import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Icon,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { RouterActionSection } from "./components/CommonActions";
import { useCachedOpenWrtData } from "./lib/cache";
import {
  buildKeyValueTable,
  buildMarkdownTable,
  escapeMarkdownText,
  formatBytes,
  formatCacheBadge,
  formatDuration,
  formatLoadAverage,
  formatPercent,
  formatRelativeAge,
  inlineCode,
  modShortcut,
} from "./lib/format";
import { fetchRouterStatus, rebootRouter } from "./lib/openwrt";
import type { ExtensionPreferences, RouterStatusSnapshot } from "./lib/types";
import { OpenWrtError, getErrorDescription } from "./lib/ubus";

function buildRouterStatusMarkdown(
  snapshot: RouterStatusSnapshot | undefined,
  error: Error | undefined,
  cacheState: { isCached: boolean; isStale: boolean; isLoading: boolean; updatedAt: number | null },
): string {
  if (error && !snapshot) {
    const info = getErrorDescription(error);
    return `# ${info.title}\n\n${info.message}`;
  }

  if (!snapshot) {
    return "# OpenWrt Router Status\n\nConnecting to router via ubus RPC...";
  }

  const firmware = snapshot.board.release?.description || snapshot.board.release?.version || "OpenWrt";
  const target = snapshot.board.release?.target || snapshot.board.system;
  const lines: string[] = [
    `# ${escapeMarkdownText(snapshot.board.hostname)}`,
    "",
    `**${escapeMarkdownText(snapshot.board.model)}** · ${escapeMarkdownText(firmware)} · ${escapeMarkdownText(target)}`,
  ];

  if (cacheState.isStale) {
    const age = formatRelativeAge(cacheState.updatedAt);
    const kind = cacheState.isCached ? "cached" : "stale";
    if (cacheState.isLoading) {
      lines.push("", `> Showing ${kind} snapshot (${age}) — updating from router...`);
    } else if (error) {
      const info = getErrorDescription(error);
      lines.push("", `> Showing ${kind} snapshot (${age}) — live refresh failed: ${info.message}`);
    } else {
      lines.push("", `> Showing ${kind} snapshot (${age}).`);
    }
  }

  lines.push("", "## Network Interfaces", "");
  if (snapshot.interfaces.length === 0) {
    lines.push("_No network interfaces reported._");
  } else {
    const ifaceRows = snapshot.interfaces.map((iface) => {
      const stateIcon = iface.up ? "✓" : iface.pending ? "⋯" : "○";
      const address = iface.ipv4[0] || iface.ipv6[0] || "—";
      const uptime = iface.uptime !== null ? formatDuration(iface.uptime) : "—";
      const traffic =
        iface.rxBytes !== null && iface.txBytes !== null
          ? `↓ ${formatBytes(iface.rxBytes)} / ↑ ${formatBytes(iface.txBytes)}`
          : "—";
      return [
        `${stateIcon} **${escapeMarkdownText(iface.name)}** (${inlineCode(iface.proto)})`,
        address === "—" ? "—" : inlineCode(address),
        uptime,
        traffic,
      ];
    });
    lines.push(buildMarkdownTable(["Interface", "Address", "Uptime", "Traffic"], ifaceRows));

    const routingRows: Array<[string, string]> = [];
    for (const iface of snapshot.interfaces) {
      if (iface.gateway) {
        routingRows.push([`${iface.name} Gateway`, inlineCode(iface.gateway)]);
      }
      if (iface.dns.length > 0) {
        routingRows.push([`${iface.name} DNS`, iface.dns.map((d) => inlineCode(d)).join(", ")]);
      }
      if (iface.linkSpeedMbps) {
        routingRows.push([`${iface.name} Link`, `${iface.linkSpeedMbps} Mbps`]);
      }
    }
    if (routingRows.length > 0) {
      lines.push("", "## Routing & DNS", "", buildKeyValueTable(routingRows, "Link", "Details"));
    }
  }

  lines.push("", "## Wireless Radios", "");
  if (snapshot.radios.length === 0) {
    lines.push("_No wireless radios detected._");
  } else {
    const radioRows = snapshot.radios.map((radio) => [
      `**${escapeMarkdownText(radio.ssid)}** (${inlineCode(radio.device)})`,
      radio.band,
      radio.channel ? `Ch ${radio.channel}` : "?",
      radio.htmode ? `${radio.mode} (${radio.htmode})` : radio.mode,
      String(radio.stationCount),
    ]);
    lines.push(buildMarkdownTable(["SSID", "Band", "Channel", "Mode", "Clients"], radioRows));
  }

  return lines.join("\n");
}

function buildCopySummary(snapshot: RouterStatusSnapshot): string {
  const memUsed = Math.max(
    0,
    snapshot.info.memory.total - (snapshot.info.memory.available ?? snapshot.info.memory.free),
  );
  const memPct = formatPercent(memUsed, snapshot.info.memory.total);
  const wan = snapshot.interfaces.find((i) => i.name === "wan");
  const lan = snapshot.interfaces.find((i) => i.name === "lan");

  return [
    `${snapshot.board.hostname} (${snapshot.board.model})`,
    `Firmware: ${snapshot.board.release?.description || "OpenWrt"} | Kernel: ${snapshot.board.kernel}`,
    `Uptime: ${formatDuration(snapshot.info.uptime)} | Load: ${formatLoadAverage(snapshot.info.load)}`,
    `Memory: ${formatBytes(memUsed)} / ${formatBytes(snapshot.info.memory.total)} (${memPct})`,
    ...(wan ? [`WAN: ${wan.up ? "UP" : "DOWN"} ${wan.ipv4[0] || ""}`.trim()] : []),
    ...(lan ? [`LAN: ${lan.ipv4[0] || ""}`.trim()] : []),
    `Clients: ${snapshot.wifiClientCount} Wi-Fi, ${snapshot.dhcpLeaseCount} DHCP leases`,
  ].join("\n");
}

export default function RouterStatusCommand() {
  const {
    data: snapshot,
    error,
    isLoading,
    isCached,
    isStale,
    updatedAt,
    revalidate,
  } = useCachedOpenWrtData("router-status", (signal) =>
    fetchRouterStatus(getPreferenceValues<ExtensionPreferences>(), signal),
  );

  async function handleRebootRouter() {
    const confirmed = await confirmAlert({
      title: "Reboot OpenWrt Router?",
      message: `This will immediately reboot ${snapshot?.board.hostname || "the router"} and temporarily disconnect your network.`,
      primaryAction: {
        title: "Reboot Router",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Rebooting Router...",
    });
    try {
      await rebootRouter(getPreferenceValues<ExtensionPreferences>());
      toast.style = Toast.Style.Success;
      toast.title = "Reboot Initiated";
      toast.message = "The router is restarting.";
    } catch (err) {
      await toast.hide();
      const { title, message } = getErrorDescription(err);
      await showFailureToast(message, { title });
    }
  }

  const wanIp = snapshot?.interfaces.find((i) => i.name === "wan")?.ipv4[0]?.split("/")[0];
  const lanIp = snapshot?.interfaces.find((i) => i.name === "lan")?.ipv4[0]?.split("/")[0];

  const memTotal = snapshot?.info.memory.total ?? 0;
  const memAvail = snapshot ? (snapshot.info.memory.available ?? snapshot.info.memory.free) : 0;
  const memUsed = Math.max(0, memTotal - memAvail);

  const rootMount = snapshot?.info.root;
  const tmpMount = snapshot?.info.tmp;
  const swapTotal = snapshot?.info.swap?.total ?? 0;
  const swapFree = snapshot?.info.swap?.free ?? 0;
  const swapUsed = Math.max(0, swapTotal - swapFree);

  const isConfigError =
    error instanceof OpenWrtError &&
    (error.code === "AUTH_FAILED" || error.code === "INVALID_URL" || error.code === "TLS_ERROR");

  const cacheBadge = formatCacheBadge({ isCached, isLoading, error, updatedAt });
  const snapshotAge = formatRelativeAge(updatedAt);

  return (
    <Detail
      isLoading={isLoading}
      markdown={buildRouterStatusMarkdown(snapshot, error, { isCached, isStale, isLoading, updatedAt })}
      metadata={
        snapshot ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
              {isStale && isLoading ? (
                <>
                  <Detail.Metadata.TagList.Item text="Cached" color={Color.Yellow} />
                  <Detail.Metadata.TagList.Item text="Updating..." color={Color.SecondaryText} />
                </>
              ) : isStale && error ? (
                <>
                  <Detail.Metadata.TagList.Item text="Offline" color={Color.Orange} />
                  <Detail.Metadata.TagList.Item text="Refresh failed" color={Color.SecondaryText} />
                </>
              ) : isCached ? (
                <Detail.Metadata.TagList.Item text="Cached" color={Color.Yellow} />
              ) : (
                <Detail.Metadata.TagList.Item text="Online" color={Color.Green} />
              )}
              {snapshot.board.release?.version && (
                <Detail.Metadata.TagList.Item
                  text={`${snapshot.board.release.distribution || "OpenWrt"} ${snapshot.board.release.version}`}
                  color={Color.Blue}
                />
              )}
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Snapshot" text={cacheBadge ?? `Live · ${snapshotAge}`} />
            <Detail.Metadata.Label title="Hostname" text={snapshot.board.hostname} />
            <Detail.Metadata.Label title="Model" text={snapshot.board.model} />
            <Detail.Metadata.Label title="Kernel" text={snapshot.board.kernel} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Uptime" text={formatDuration(snapshot.info.uptime)} />
            <Detail.Metadata.Label title="Load Average" text={formatLoadAverage(snapshot.info.load)} />
            {snapshot.cpuUsage && <Detail.Metadata.Label title="CPU Usage" text={snapshot.cpuUsage} />}
            {snapshot.tempInfo && <Detail.Metadata.Label title="Temperatures" text={snapshot.tempInfo} />}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Memory Used"
              text={`${formatBytes(memUsed)} / ${formatBytes(memTotal)} (${formatPercent(memUsed, memTotal)})`}
            />
            <Detail.Metadata.Label title="Memory Available" text={formatBytes(memAvail)} />
            {swapTotal > 0 && (
              <Detail.Metadata.Label
                title="Swap Used"
                text={`${formatBytes(swapUsed)} / ${formatBytes(swapTotal)} (${formatPercent(swapUsed, swapTotal)})`}
              />
            )}
            {rootMount && (
              <Detail.Metadata.Label
                title="Overlay Storage"
                text={`${formatBytes(rootMount.used * 1024)} / ${formatBytes(rootMount.total * 1024)} (${formatPercent(rootMount.used, rootMount.total)})`}
              />
            )}
            {tmpMount && (
              <Detail.Metadata.Label
                title="/tmp Usage"
                text={`${formatBytes(tmpMount.used * 1024)} / ${formatBytes(tmpMount.total * 1024)} (${formatPercent(tmpMount.used, tmpMount.total)})`}
              />
            )}
            {snapshot.conntrack && (
              <Detail.Metadata.Label
                title="Conntrack"
                text={`${snapshot.conntrack.count.toLocaleString()} / ${snapshot.conntrack.max.toLocaleString()} (${formatPercent(snapshot.conntrack.count, snapshot.conntrack.max)})`}
              />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Wi-Fi Clients" text={String(snapshot.wifiClientCount)} />
            <Detail.Metadata.Label title="DHCP Leases" text={String(snapshot.dhcpLeaseCount)} />
            {snapshot.luciVersion && <Detail.Metadata.Label title="LuCI" text={snapshot.luciVersion} />}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {snapshot && (
            <ActionPanel.Section title="Copy">
              {wanIp && <Action.CopyToClipboard title="Copy WAN IP" content={wanIp} />}
              {lanIp && <Action.CopyToClipboard title="Copy LAN IP" content={lanIp} />}
              <Action.CopyToClipboard
                title="Copy Status Summary"
                content={buildCopySummary(snapshot)}
                shortcut={modShortcut(["shift"], "c")}
              />
            </ActionPanel.Section>
          )}
          <RouterActionSection onRefresh={revalidate} promotePreferences={isConfigError} />
          {snapshot && (
            <ActionPanel.Section title="System">
              <Action
                title="Reboot Router"
                icon={Icon.Power}
                style={Action.Style.Destructive}
                onAction={handleRebootRouter}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
