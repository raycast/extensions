import { useMemo, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { RouterActionSection, ServiceLogsDetail } from "./components/CommonActions";
import { useCachedOpenWrtData } from "./lib/cache";
import {
  buildKeyValueTable,
  buildSafeCodeBlock,
  escapeMarkdownText,
  formatBytes,
  formatCacheBadge,
  formatDuration,
  inlineCode,
  modShortcut,
} from "./lib/format";
import { fetchServicesAndInterfaces, fetchWireGuardPeers, runInterfaceAction, runServiceAction } from "./lib/openwrt";
import type {
  ExtensionPreferences,
  ManagedInitService,
  ManagedNetworkInterface,
  ManagedServiceItem,
  WireGuardPeer,
} from "./lib/types";
import { OpenWrtError, getErrorDescription } from "./lib/ubus";

type ServiceFilter = "all" | "pinned" | "running" | "stopped" | "services" | "interfaces";

function isItemActive(item: ManagedServiceItem): boolean {
  return item.kind === "service" ? item.running : item.up;
}

function matchesServiceFilter(item: ManagedServiceItem, filter: ServiceFilter): boolean {
  switch (filter) {
    case "pinned":
      return item.pinned || (item.kind === "interface" && item.isVpn);
    case "running":
      return isItemActive(item);
    case "stopped":
      return !isItemActive(item);
    case "services":
      return item.kind === "service";
    case "interfaces":
      return item.kind === "interface";
    default:
      return true;
  }
}

function buildServiceMarkdown(service: ManagedInitService): string {
  const instanceSummary =
    service.instances.length > 0
      ? `${service.instances.filter((i) => i.running).length}/${service.instances.length} active instance${service.instances.length === 1 ? "" : "s"}`
      : "No active daemon instances";
  const summaryParts = [
    `**${service.running ? "Running" : "Stopped"}**`,
    instanceSummary,
    service.enabled ? "Boot enabled" : "Boot disabled",
  ];

  const lines: string[] = [`### ${escapeMarkdownText(service.name)}`, "", summaryParts.join(" · ")];

  if (service.instances.length > 0) {
    lines.push("", "#### procd Instances");
    for (const inst of service.instances) {
      const respawnText = inst.respawn ? ` · Respawn (${inst.respawn.timeout}s / ${inst.respawn.retry}x)` : "";
      lines.push(
        "",
        `**${escapeMarkdownText(inst.name)}** — ${inst.running ? "✓ Running" : "○ Stopped"}${inst.pid ? ` · PID ${inlineCode(String(inst.pid))}` : ""}${respawnText}`,
      );
      if (inst.command.length > 0) {
        lines.push("", buildSafeCodeBlock(inst.command.join(" "), "bash"));
      }
    }
  } else {
    lines.push(
      "",
      "_One-shot init scripts (such as `firewall` or `sysctl`) apply kernel settings and exit rather than running a persistent daemon._",
    );
  }

  return lines.join("\n");
}

function buildInterfaceMarkdown(
  iface: ManagedNetworkInterface,
  peers?: WireGuardPeer[] | null,
  isLoadingPeers = false,
): string {
  const statusText = iface.up ? "Up" : iface.pending ? "Pending" : "Down";
  const lines: string[] = [
    `### ${escapeMarkdownText(iface.name)}`,
    "",
    `**${statusText}** · Proto ${inlineCode(iface.proto)} · Device ${inlineCode(iface.device || "unassigned")}`,
  ];

  const rows: Array<[string, string]> = [];
  if (iface.ipv6.length > 0) {
    rows.push(["IPv6", iface.ipv6.map((ip) => inlineCode(ip)).join(", ")]);
  }
  if (iface.dns.length > 0) {
    rows.push(["DNS", iface.dns.map((d) => inlineCode(d)).join(", ")]);
  }

  if (rows.length > 0) {
    lines.push("", buildKeyValueTable(rows, "Property", "Details"));
  }

  if (iface.proto === "wireguard") {
    lines.push("", "#### WireGuard Peers");
    if (isLoadingPeers && peers === undefined) {
      lines.push("", "_Loading WireGuard peers..._");
    } else if (!peers) {
      lines.push("", "_Peer dump unavailable (ensure `wireguard-tools` and `file.exec` permissions are present)._");
    } else if (peers.length === 0) {
      lines.push("", "_No WireGuard peers configured on this interface._");
    } else {
      for (const peer of peers) {
        const shortKey = peer.publicKey.length > 10 ? `${peer.publicKey.slice(0, 10)}...` : peer.publicKey;
        const peerRows: Array<[string, string]> = [
          ["Endpoint", peer.endpoint ? inlineCode(peer.endpoint) : "—"],
          ["Allowed IPs", peer.allowedIps ? inlineCode(peer.allowedIps) : "none"],
          ["Handshake", peer.latestHandshakeSec !== null ? `${formatDuration(peer.latestHandshakeSec)} ago` : "Never"],
          ["Transfer", `↓ ${formatBytes(peer.rxBytes)} / ↑ ${formatBytes(peer.txBytes)}`],
        ];
        lines.push("", `**Peer ${inlineCode(shortKey)}**`, "", buildKeyValueTable(peerRows, "Field", "Value"));
      }
    }
  }

  return lines.join("\n");
}

function getInterfaceStatusColor(iface: ManagedNetworkInterface): Color {
  if (iface.up) {
    return Color.Green;
  }
  if (iface.pending) {
    return Color.Yellow;
  }
  return iface.critical ? Color.Red : Color.SecondaryText;
}

export default function ManageServicesCommand() {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const [filter, setFilter] = useState<ServiceFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const wgAbortable = useRef<AbortController | undefined>(undefined);

  const {
    data: items,
    error,
    isLoading,
    isCached,
    updatedAt,
    revalidate,
  } = useCachedOpenWrtData(
    "services",
    (signal) => fetchServicesAndInterfaces(getPreferenceValues<ExtensionPreferences>(), signal),
    { variant: prefs.pinnedServices?.trim() || "" },
  );

  const allItems = useMemo(() => items ?? [], [items]);

  const selectedWireGuardInterface = useMemo(() => {
    if (!selectedId) {
      return null;
    }
    const found = allItems.find((item) => item.id === selectedId);
    return found?.kind === "interface" && found.proto === "wireguard" ? found.name : null;
  }, [allItems, selectedId]);

  const {
    data: wgPeersState,
    isLoading: isLoadingWgPeers,
    revalidate: revalidateWgPeers,
  } = usePromise(
    async (ifaceName: string) => ({
      ifaceName,
      peers: await fetchWireGuardPeers(
        ifaceName,
        getPreferenceValues<ExtensionPreferences>(),
        wgAbortable.current?.signal,
      ),
    }),
    [selectedWireGuardInterface ?? ""],
    {
      execute: Boolean(selectedWireGuardInterface),
      abortable: wgAbortable,
      onError: () => {
        // Gracefully degrade when wg binary or permissions are absent.
      },
    },
  );

  function handleRefresh() {
    void revalidate();
    if (selectedWireGuardInterface) {
      void revalidateWgPeers();
    }
  }

  async function handleServiceControl(
    service: ManagedInitService,
    action: "start" | "stop" | "restart" | "reload" | "enable" | "disable",
  ) {
    if (action === "stop" || action === "disable" || (action === "restart" && service.critical)) {
      const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);
      const confirmMessage = service.critical
        ? `"${service.name}" is a critical router service. Changing its state may disrupt LAN, firewall, or LuCI/ubus access.`
        : action === "disable"
          ? `Disable "${service.name}" from starting automatically on router boot?`
          : `Stop the "${service.name}" service on the router?`;
      const confirmed = await confirmAlert({
        title: action === "disable" ? `Disable ${service.name} at Boot?` : `${actionLabel} ${service.name}?`,
        message: confirmMessage,
        primaryAction: {
          title: action === "disable" ? "Disable at Boot" : `${actionLabel} Service`,
          style: action === "stop" || action === "disable" ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
        },
      });
      if (!confirmed) {
        return;
      }
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Running ${action} on ${service.name}...`,
    });
    try {
      await runServiceAction(service.name, action, getPreferenceValues<ExtensionPreferences>());
      toast.style = Toast.Style.Success;
      toast.title = `${service.name} (${action})`;
      toast.message = "Action completed";
      void revalidate();
    } catch (err) {
      await toast.hide();
      const { title, message } = getErrorDescription(err);
      await showFailureToast(message, { title });
    }
  }

  async function handleInterfaceControl(iface: ManagedNetworkInterface, action: "up" | "down" | "restart") {
    if (action === "down" || (action === "restart" && iface.critical)) {
      const confirmed = await confirmAlert({
        title: `${action === "down" ? "Bring Down" : "Restart"} ${iface.name}?`,
        message: iface.critical
          ? `"${iface.name}" is a core network interface. Changing its state may drop your connection to the router.`
          : `Bring down network interface "${iface.name}"?`,
        primaryAction: {
          title: action === "down" ? "Bring Interface Down" : "Restart Interface",
          style: action === "down" ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
        },
      });
      if (!confirmed) {
        return;
      }
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${action === "restart" ? "Restarting" : action === "up" ? "Starting" : "Stopping"} ${iface.name}...`,
    });
    try {
      await runInterfaceAction(iface.name, action, getPreferenceValues<ExtensionPreferences>());
      toast.style = Toast.Style.Success;
      toast.title = `${iface.name} (${action})`;
      toast.message = "Interface updated";
      void revalidate();
      if (iface.proto === "wireguard" && iface.name === selectedWireGuardInterface) {
        void revalidateWgPeers();
      }
    } catch (err) {
      await toast.hide();
      const { title, message } = getErrorDescription(err);
      await showFailureToast(message, { title });
    }
  }

  const filteredItems = useMemo(
    () => allItems.filter((item) => matchesServiceFilter(item, filter)),
    [allItems, filter],
  );

  const pinnedItems = useMemo(
    () => filteredItems.filter((item) => item.pinned || (item.kind === "interface" && item.isVpn)),
    [filteredItems],
  );
  const pinnedIds = useMemo(() => new Set(pinnedItems.map((i) => i.id)), [pinnedItems]);

  const runningServices = useMemo(
    () => filteredItems.filter((item) => !pinnedIds.has(item.id) && item.kind === "service" && item.running),
    [filteredItems, pinnedIds],
  );
  const otherInterfaces = useMemo(
    () => filteredItems.filter((item) => !pinnedIds.has(item.id) && item.kind === "interface"),
    [filteredItems, pinnedIds],
  );
  const stoppedServices = useMemo(
    () => filteredItems.filter((item) => !pinnedIds.has(item.id) && item.kind === "service" && !item.running),
    [filteredItems, pinnedIds],
  );

  const cacheBadge = formatCacheBadge({ isCached, isLoading, error, updatedAt });
  const sections = useMemo(() => {
    const list: Array<{ title: string; items: ManagedServiceItem[] }> = [];
    if (pinnedItems.length > 0) {
      list.push({ title: "Pinned & VPN", items: pinnedItems });
    }
    if (runningServices.length > 0) {
      list.push({ title: "Running Services", items: runningServices });
    }
    if (otherInterfaces.length > 0) {
      list.push({ title: "Network Interfaces", items: otherInterfaces });
    }
    if (stoppedServices.length > 0) {
      list.push({ title: "Stopped Services", items: stoppedServices });
    }
    return list;
  }, [pinnedItems, runningServices, otherInterfaces, stoppedServices]);

  const isConfigError =
    error instanceof OpenWrtError &&
    (error.code === "AUTH_FAILED" || error.code === "INVALID_URL" || error.code === "TLS_ERROR");
  const errorInfo = error && allItems.length === 0 ? getErrorDescription(error) : null;

  function renderItem(item: ManagedServiceItem) {
    if (item.kind === "service") {
      const firstPid = item.instances.find((inst) => inst.pid)?.pid ?? null;
      const firstCmd = item.instances.find((inst) => inst.command.length > 0)?.command.join(" ") ?? "";
      const statusColor = item.running ? Color.Green : Color.SecondaryText;

      return (
        <List.Item
          key={item.id}
          id={item.id}
          icon={{ source: item.running ? Icon.CheckCircle : Icon.Circle, tintColor: statusColor }}
          title={item.name}
          subtitle={firstPid ? `PID ${firstPid}` : undefined}
          keywords={[item.name, item.running ? "running" : "stopped", item.enabled ? "enabled" : "disabled", firstCmd]}
          accessories={[
            {
              tag: {
                value: item.running ? "Running" : "Stopped",
                color: statusColor,
              },
            },
          ]}
          detail={
            <List.Item.Detail
              markdown={buildServiceMarkdown(item)}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.TagList title="State">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={item.running ? "Running" : "Stopped"}
                      color={statusColor}
                    />
                    <List.Item.Detail.Metadata.TagList.Item
                      text={item.enabled ? "Boot Enabled" : "Boot Disabled"}
                      color={item.enabled ? Color.Blue : Color.SecondaryText}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  {firstPid && <List.Item.Detail.Metadata.Label title="PID" text={String(firstPid)} />}
                  {item.startPriority !== null && (
                    <List.Item.Detail.Metadata.Label title="Start Priority" text={String(item.startPriority)} />
                  )}
                  <List.Item.Detail.Metadata.Label title="Instances" text={String(item.instances.length)} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Service">
                {item.running ? (
                  <>
                    <Action.Push
                      title="View Recent Logs"
                      icon={Icon.Terminal}
                      target={<ServiceLogsDetail serviceName={item.name} />}
                    />
                    <Action.CopyToClipboard title="Copy Service Name" content={item.name} />
                    <Action
                      title="Restart Service"
                      icon={Icon.RotateClockwise}
                      shortcut={modShortcut(["shift"], "r")}
                      onAction={() => handleServiceControl(item, "restart")}
                    />
                    <Action
                      title="Reload Service"
                      icon={Icon.ArrowClockwise}
                      onAction={() => handleServiceControl(item, "reload")}
                    />
                    <Action
                      title="Stop Service"
                      icon={Icon.Stop}
                      style={Action.Style.Destructive}
                      onAction={() => handleServiceControl(item, "stop")}
                    />
                  </>
                ) : (
                  <>
                    <Action
                      title="Start Service"
                      icon={Icon.Play}
                      onAction={() => handleServiceControl(item, "start")}
                    />
                    <Action.Push
                      title="View Recent Logs"
                      icon={Icon.Terminal}
                      shortcut={modShortcut([], "l")}
                      target={<ServiceLogsDetail serviceName={item.name} />}
                    />
                    <Action
                      title="Restart Service"
                      icon={Icon.RotateClockwise}
                      shortcut={modShortcut(["shift"], "r")}
                      onAction={() => handleServiceControl(item, "restart")}
                    />
                  </>
                )}
                <Action
                  title={item.enabled ? "Disable at Boot" : "Enable at Boot"}
                  icon={item.enabled ? Icon.XMarkCircle : Icon.Check}
                  style={item.enabled ? Action.Style.Destructive : Action.Style.Regular}
                  onAction={() => handleServiceControl(item, item.enabled ? "disable" : "enable")}
                />
              </ActionPanel.Section>
              {(!item.running || Boolean(firstCmd)) && (
                <ActionPanel.Section title="Copy">
                  {!item.running && <Action.CopyToClipboard title="Copy Service Name" content={item.name} />}
                  {firstCmd && <Action.CopyToClipboard title="Copy Command Line" content={firstCmd} concealed />}
                </ActionPanel.Section>
              )}
              <RouterActionSection onRefresh={handleRefresh} />
            </ActionPanel>
          }
        />
      );
    }

    const peers =
      selectedWireGuardInterface === item.name && wgPeersState?.ifaceName === item.name
        ? wgPeersState.peers
        : undefined;
    const isLoadingPeers = selectedWireGuardInterface === item.name && isLoadingWgPeers;
    const primaryIp = item.ipv4[0]?.split("/")[0] || item.ipv6[0]?.split("/")[0] || "";
    const statusColor = getInterfaceStatusColor(item);

    return (
      <List.Item
        key={item.id}
        id={item.id}
        icon={{ source: item.isVpn ? Icon.Shield : Icon.Network, tintColor: statusColor }}
        title={item.name}
        subtitle={item.proto}
        keywords={[item.name, item.proto, item.device, ...item.ipv4, ...item.ipv6, item.isVpn ? "vpn" : "interface"]}
        accessories={[
          {
            tag: {
              value: item.up ? "Up" : item.pending ? "Pending" : "Down",
              color: statusColor,
            },
          },
        ]}
        detail={
          <List.Item.Detail
            markdown={buildInterfaceMarkdown(item, peers, isLoadingPeers)}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.TagList title="Interface">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={item.up ? "Up" : item.pending ? "Pending" : "Down"}
                    color={statusColor}
                  />
                  <List.Item.Detail.Metadata.TagList.Item text={item.proto} color={Color.Blue} />
                </List.Item.Detail.Metadata.TagList>
                <List.Item.Detail.Metadata.Label title="Device" text={item.device || "None"} />
                {item.uptime !== null && (
                  <List.Item.Detail.Metadata.Label title="Uptime" text={formatDuration(item.uptime)} />
                )}
                {item.ipv4.length > 0 && <List.Item.Detail.Metadata.Label title="IPv4" text={item.ipv4.join(", ")} />}
                {item.gateway && <List.Item.Detail.Metadata.Label title="Gateway" text={item.gateway} />}
                {item.rxBytes !== null && item.txBytes !== null && (
                  <List.Item.Detail.Metadata.Label
                    title="Traffic"
                    text={`↓ ${formatBytes(item.rxBytes)} / ↑ ${formatBytes(item.txBytes)}`}
                  />
                )}
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Interface">
              {item.up ? (
                <>
                  <Action.Push
                    title="View Recent Logs"
                    icon={Icon.Terminal}
                    target={<ServiceLogsDetail serviceName={item.name} />}
                  />
                  {primaryIp ? (
                    <Action.CopyToClipboard title="Copy Interface IP" content={primaryIp} />
                  ) : (
                    <Action.CopyToClipboard title="Copy Interface Name" content={item.name} />
                  )}
                  <Action
                    title="Restart Interface"
                    icon={Icon.RotateClockwise}
                    shortcut={modShortcut(["shift"], "r")}
                    onAction={() => handleInterfaceControl(item, "restart")}
                  />
                  <Action
                    title="Stop Interface"
                    icon={Icon.Stop}
                    style={Action.Style.Destructive}
                    onAction={() => handleInterfaceControl(item, "down")}
                  />
                </>
              ) : (
                <>
                  <Action
                    title="Start Interface"
                    icon={Icon.Play}
                    onAction={() => handleInterfaceControl(item, "up")}
                  />
                  <Action.Push
                    title="View Recent Logs"
                    icon={Icon.Terminal}
                    shortcut={modShortcut([], "l")}
                    target={<ServiceLogsDetail serviceName={item.name} />}
                  />
                  <Action
                    title="Restart Interface"
                    icon={Icon.RotateClockwise}
                    shortcut={modShortcut(["shift"], "r")}
                    onAction={() => handleInterfaceControl(item, "restart")}
                  />
                </>
              )}
            </ActionPanel.Section>
            {(!item.up || Boolean(primaryIp)) && (
              <ActionPanel.Section title="Copy">
                {!item.up && primaryIp && <Action.CopyToClipboard title="Copy Interface IP" content={primaryIp} />}
                <Action.CopyToClipboard title="Copy Interface Name" content={item.name} />
              </ActionPanel.Section>
            )}
            <RouterActionSection onRefresh={handleRefresh} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={filteredItems.length > 0}
      onSelectionChange={setSelectedId}
      searchBarPlaceholder="Search services, WireGuard, sing-box, dnsmasq, or interfaces..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Services" value={filter} onChange={(value) => setFilter(value as ServiceFilter)}>
          <List.Dropdown.Item title="All Services & Interfaces" value="all" />
          <List.Dropdown.Item title="Pinned & VPN" value="pinned" />
          <List.Dropdown.Item title="Running / Up" value="running" />
          <List.Dropdown.Item title="Stopped / Down" value="stopped" />
          <List.Dropdown.Item title="System Services" value="services" />
          <List.Dropdown.Item title="Network & VPN Interfaces" value="interfaces" />
        </List.Dropdown>
      }
    >
      {errorInfo ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={errorInfo.title}
          description={errorInfo.message}
          actions={
            <ActionPanel>
              <RouterActionSection onRefresh={handleRefresh} promotePreferences={isConfigError} />
            </ActionPanel>
          }
        />
      ) : filteredItems.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Gear}
          title="No Matching Services"
          description="Try another search query or change the filter dropdown."
          actions={
            <ActionPanel>
              <RouterActionSection onRefresh={handleRefresh} />
            </ActionPanel>
          }
        />
      ) : (
        sections.map((section, idx) => {
          const subtitle =
            idx === 0 && cacheBadge ? `${section.items.length} · ${cacheBadge}` : String(section.items.length);
          return (
            <List.Section key={section.title} title={section.title} subtitle={subtitle}>
              {section.items.map(renderItem)}
            </List.Section>
          );
        })
      )}
    </List>
  );
}
