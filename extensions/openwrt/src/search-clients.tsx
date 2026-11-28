import { useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { RouterActionSection } from "./components/CommonActions";
import { StaticLeaseForm } from "./components/StaticLeaseForm";
import { useCachedOpenWrtData, invalidateCachedKey } from "./lib/cache";
import {
  buildKeyValueTable,
  buildSafeCodeBlock,
  escapeMarkdownText,
  formatBitrateKbps,
  formatBytes,
  formatCacheBadge,
  formatDuration,
  getSignalMeta,
  inlineCode,
  modShortcut,
} from "./lib/format";
import { disconnectWifiClient, fetchClients, pingFromRouter } from "./lib/openwrt";
import type { ClientRecord, ExtensionPreferences } from "./lib/types";
import { OpenWrtError, getErrorDescription } from "./lib/ubus";

type ClientFilter = "all" | "wifi" | "wifi-high" | "wifi-24" | "wired-dhcp";

function matchesFilter(client: ClientRecord, filter: ClientFilter): boolean {
  switch (filter) {
    case "wifi":
      return Boolean(client.wifi);
    case "wifi-high":
      return client.wifi?.band === "5 GHz" || client.wifi?.band === "6 GHz";
    case "wifi-24":
      return client.wifi?.band === "2.4 GHz";
    case "wired-dhcp":
      return !client.wifi;
    default:
      return true;
  }
}

function buildClientMarkdown(client: ClientRecord): string {
  const title = client.hostname || client.ip || client.mac;
  const lines: string[] = [`### ${escapeMarkdownText(title)}`, ""];
  const tableRows: Array<[string, string]> = [];

  if (client.wifi) {
    const channelLabel = client.wifi.channel ? `Ch ${client.wifi.channel}` : "";
    const parts = [
      `Connected to **${escapeMarkdownText(client.wifi.ssid)}** (${inlineCode(client.wifi.device)})`,
      client.wifi.band,
      channelLabel,
      client.wifi.standard || "",
    ].filter(Boolean);
    lines.push(parts.join(" · "), "");

    tableRows.push([
      "Link Rates",
      `RX ${formatBitrateKbps(client.wifi.rxRateKbps)} / TX ${formatBitrateKbps(client.wifi.txRateKbps)}`,
    ]);
    tableRows.push([
      "Session Traffic",
      `↓ ${formatBytes(client.wifi.rxBytes)} / ↑ ${formatBytes(client.wifi.txBytes)}`,
    ]);
    if (client.wifi.inactiveMs !== null) {
      tableRows.push(["Inactive", `${client.wifi.inactiveMs} ms`]);
    }
  } else {
    lines.push(
      client.hasDhcpLease
        ? "Wired / LAN client with an active DHCP lease."
        : "Static IP or ARP neighbor entry (no active DHCP lease).",
      "",
    );
  }

  if (client.allIps.length > 1) {
    tableRows.push(["All IPv4s", client.allIps.map((ip) => inlineCode(ip)).join(", ")]);
  }

  if (tableRows.length > 0) {
    lines.push(buildKeyValueTable(tableRows, "Metric", "Details"));
  }

  if (client.ipv6.length > 0) {
    const shown = client.ipv6.slice(0, 6);
    const extra = client.ipv6.length > 6 ? `\n(+${client.ipv6.length - 6} more)` : "";
    lines.push("", "#### IPv6 Addresses", "", buildSafeCodeBlock(`${shown.join("\n")}${extra}`));
  }

  return lines.join("\n");
}

function buildClientSummary(client: ClientRecord): string {
  const parts = [
    client.hostname || "Unnamed Host",
    `IP: ${client.ip || "Unknown"}`,
    `MAC: ${client.mac}`,
    client.wifi
      ? `Wi-Fi: ${client.wifi.ssid} (${client.wifi.band}, ${client.wifi.signal ?? "?"} dBm)`
      : client.hasDhcpLease
        ? "DHCP Lease"
        : "Static",
  ];
  return parts.join(" | ");
}

function getClientKeywords(client: ClientRecord): string[] {
  const keywords = [client.mac, client.mac.replace(/:/g, ""), ...client.allIps, ...client.ipv6];
  if (client.hostname) {
    keywords.push(client.hostname);
  }
  if (client.wifi) {
    keywords.push("wifi", client.wifi.ssid, client.wifi.band, client.wifi.device);
  } else {
    keywords.push("wired", "ethernet");
  }
  if (client.hasDhcpLease) {
    keywords.push("dhcp");
  }
  return keywords.filter(Boolean);
}

export default function SearchClientsCommand() {
  const [filter, setFilter] = useState<ClientFilter>("all");
  const [showDetail, setShowDetail] = useState<boolean>(true);

  const {
    data: clients,
    error,
    isLoading,
    isCached,
    updatedAt,
    revalidate,
  } = useCachedOpenWrtData("clients", (signal) => fetchClients(getPreferenceValues<ExtensionPreferences>(), signal));

  const allClients = useMemo(() => clients ?? [], [clients]);
  const filteredClients = useMemo(
    () => allClients.filter((client) => matchesFilter(client, filter)),
    [allClients, filter],
  );

  async function handlePingClient(client: ClientRecord) {
    if (!client.ip) {
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Pinging ${client.ip}...`,
    });
    try {
      const res = await pingFromRouter(client.ip, 3, getPreferenceValues<ExtensionPreferences>());
      if (res.reachable) {
        toast.style = Toast.Style.Success;
        toast.title = `${client.ip} Reachable`;
        toast.message = `${res.received}/${res.transmitted} rx · ${res.avgMs !== null ? `avg ${res.avgMs.toFixed(1)} ms` : `${res.lossPercent}% loss`}`;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = `${client.ip} Unreachable`;
        toast.message = `${res.lossPercent}% packet loss`;
      }
    } catch (err) {
      await toast.hide();
      const { title, message } = getErrorDescription(err);
      await showFailureToast(message, { title });
    }
  }

  async function handleDisconnectClient(client: ClientRecord) {
    if (!client.wifi) {
      return;
    }
    const label = client.hostname || client.ip || client.mac;
    const confirmed = await confirmAlert({
      title: `Disconnect ${label}?`,
      message: `Send a deauthentication frame to ${client.mac} on ${client.wifi.ssid}. The client may reconnect automatically.`,
      primaryAction: {
        title: "Disconnect Client",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Disconnecting ${label}...`,
    });
    try {
      await disconnectWifiClient(client.wifi.device, client.mac, getPreferenceValues<ExtensionPreferences>());
      toast.style = Toast.Style.Success;
      toast.title = "Client Disconnected";
      toast.message = `${client.mac} removed from ${client.wifi.ssid}`;
      void revalidate();
    } catch (err) {
      await toast.hide();
      const { title, message } = getErrorDescription(err);
      await showFailureToast(message, { title });
    }
  }

  const wifiCount = useMemo(() => allClients.filter((c) => Boolean(c.wifi)).length, [allClients]);
  const dhcpCount = useMemo(() => allClients.filter((c) => c.hasDhcpLease).length, [allClients]);
  const cacheBadge = formatCacheBadge({ isCached, isLoading, error, updatedAt });
  const countsText = allClients.length > 0 ? `${wifiCount} Wi-Fi · ${dhcpCount} DHCP · ${allClients.length} total` : "";
  const sectionSubtitle = [cacheBadge, countsText].filter(Boolean).join(" · ") || undefined;

  const isConfigError =
    error instanceof OpenWrtError &&
    (error.code === "AUTH_FAILED" || error.code === "INVALID_URL" || error.code === "TLS_ERROR");
  const errorInfo = error && allClients.length === 0 ? getErrorDescription(error) : null;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail && filteredClients.length > 0}
      searchBarPlaceholder="Search clients by hostname, IP, MAC, or SSID..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Clients" value={filter} onChange={(value) => setFilter(value as ClientFilter)}>
          <List.Dropdown.Item title="All Clients" value="all" />
          <List.Dropdown.Item title="Wi-Fi Connected" value="wifi" />
          <List.Dropdown.Item title="Wi-Fi 5 GHz / 6 GHz" value="wifi-high" />
          <List.Dropdown.Item title="Wi-Fi 2.4 GHz" value="wifi-24" />
          <List.Dropdown.Item title="DHCP / Wired Only" value="wired-dhcp" />
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
              <RouterActionSection
                onRefresh={revalidate}
                promotePreferences={isConfigError}
                primaryRefresh={!isConfigError}
              />
            </ActionPanel>
          }
        />
      ) : filteredClients.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Network}
          title="No Matching Clients"
          description="No DHCP leases or wireless clients matched the current filter."
          actions={
            <ActionPanel>
              <RouterActionSection onRefresh={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Connected & Leased Clients" subtitle={sectionSubtitle}>
          {filteredClients.map((client) => {
            const title = client.hostname || client.ip || client.mac;
            const subtitle = client.hostname ? (client.ip ?? client.mac) : client.ip ? client.mac : undefined;
            const signalMeta = client.wifi ? getSignalMeta(client.wifi.signal) : null;

            const icon = client.wifi
              ? { source: Icon.Wifi, tintColor: signalMeta?.color ?? Color.Blue }
              : { source: Icon.Desktop, tintColor: Color.SecondaryText };

            const accessories: List.Item.Accessory[] = [];
            if (client.wifi) {
              accessories.push({
                tag: {
                  value: `${client.wifi.band}${client.wifi.signal !== null ? ` · ${client.wifi.signal} dBm` : ""}`,
                  color: signalMeta?.color ?? Color.Blue,
                },
              });
            } else if (client.hasDhcpLease) {
              accessories.push({ tag: { value: "DHCP", color: Color.SecondaryText } });
            } else {
              accessories.push({ tag: { value: "Static", color: Color.SecondaryText } });
            }

            if (!showDetail) {
              accessories.push({ text: client.mac });
            }

            return (
              <List.Item
                key={client.id}
                id={client.id}
                icon={icon}
                title={title}
                subtitle={subtitle}
                keywords={getClientKeywords(client)}
                accessories={accessories}
                detail={
                  showDetail ? (
                    <List.Item.Detail
                      markdown={buildClientMarkdown(client)}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="IPv4 Address" text={client.ip || "None"} />
                          <List.Item.Detail.Metadata.Label title="MAC Address" text={client.mac} />
                          <List.Item.Detail.Metadata.Label
                            title="Hostname"
                            text={client.hostname || "Not advertised"}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          {client.wifi ? (
                            <>
                              <List.Item.Detail.Metadata.TagList title="Signal">
                                <List.Item.Detail.Metadata.TagList.Item
                                  text={
                                    client.wifi.signal !== null
                                      ? `${client.wifi.signal} dBm (${signalMeta?.label})`
                                      : "Unknown"
                                  }
                                  color={signalMeta?.color ?? Color.SecondaryText}
                                />
                              </List.Item.Detail.Metadata.TagList>
                              <List.Item.Detail.Metadata.Label
                                title="Radio"
                                text={`${client.wifi.ssid} (${client.wifi.band})`}
                              />
                              <List.Item.Detail.Metadata.Label
                                title="Connected For"
                                text={formatDuration(client.wifi.connectedTimeSec)}
                              />
                            </>
                          ) : (
                            <List.Item.Detail.Metadata.Label
                              title="Connection"
                              text={client.hasDhcpLease ? "Wired / DHCP" : "Static / ARP"}
                            />
                          )}
                          <List.Item.Detail.Metadata.Label
                            title="DHCP Lease"
                            text={
                              client.hasDhcpLease
                                ? client.leaseExpiresSec !== null
                                  ? `Expires in ${formatDuration(client.leaseExpiresSec)}`
                                  : "Static lease"
                                : "No active lease"
                            }
                          />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  ) : undefined
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Copy">
                      {client.ip && <Action.CopyToClipboard title="Copy IP Address" content={client.ip} />}
                      <Action.CopyToClipboard
                        title="Copy MAC Address"
                        content={client.mac}
                        shortcut={client.ip ? modShortcut(["shift"], "c") : undefined}
                      />
                      {client.hostname && (
                        <Action.CopyToClipboard
                          title="Copy Hostname"
                          content={client.hostname}
                          shortcut={Keyboard.Shortcut.Common.CopyName}
                        />
                      )}
                      {client.ipv6[0] && <Action.CopyToClipboard title="Copy IPv6 Address" content={client.ipv6[0]} />}
                      <Action.CopyToClipboard title="Copy Client Summary" content={buildClientSummary(client)} />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Client">
                      <Action.Push
                        title="Assign Static DHCP Lease"
                        icon={Icon.Pin}
                        shortcut={modShortcut(["shift"], "s")}
                        target={
                          <StaticLeaseForm
                            initialName={client.hostname}
                            initialMac={client.mac}
                            initialIp={client.ip ?? undefined}
                            onSuccess={() => {
                              const prefs = getPreferenceValues<ExtensionPreferences>();
                              invalidateCachedKey("dhcp-dns", prefs.routerUrl, "", prefs.username?.trim() || "root");
                              void revalidate();
                            }}
                          />
                        }
                      />
                      {client.ip && (
                        <Action
                          title="Ping Client from Router"
                          icon={Icon.Network}
                          shortcut={modShortcut(["shift"], "p")}
                          onAction={() => handlePingClient(client)}
                        />
                      )}
                      <Action
                        title={showDetail ? "Hide Detail Pane" : "Show Detail Pane"}
                        icon={Icon.Sidebar}
                        shortcut={modShortcut([], "i")}
                        onAction={() => setShowDetail((prev) => !prev)}
                      />
                      {client.wifi && (
                        <Action
                          title="Disconnect Wi-Fi Client"
                          icon={Icon.XMarkCircle}
                          style={Action.Style.Destructive}
                          onAction={() => handleDisconnectClient(client)}
                        />
                      )}
                    </ActionPanel.Section>
                    <RouterActionSection onRefresh={revalidate} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
