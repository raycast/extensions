import { useMemo, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Detail,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { RouterActionSection } from "./components/CommonActions";
import { useCachedOpenWrtData } from "./lib/cache";
import {
  buildMarkdownTable,
  escapeMarkdownText,
  formatBitrateKbps,
  formatCacheBadge,
  getSignalMeta,
  inlineCode,
  modShortcut,
} from "./lib/format";
import {
  fetchWifiConfigs,
  fetchWifiPassphrase,
  fetchWifiQrSection,
  scanWifiChannels,
  setWifiSectionDisabled,
} from "./lib/openwrt-extras";
import type { ExtensionPreferences, WifiInterfaceConfig, WifiScanResult } from "./lib/types";
import { OpenWrtError, getErrorDescription } from "./lib/ubus";
import { buildWifiQrPayload, generateWifiQrDataUrl } from "./lib/wifi-qr";

type WifiFilter = "all" | "active" | "disabled";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasVisibleSsid(ssid: string): boolean {
  return ssid.trim().length > 0;
}

function formatDisplaySsid(ssid: string, fallback = "(Unnamed)"): string {
  return hasVisibleSsid(ssid) ? ssid : fallback;
}

function isWifiActive(iface: WifiInterfaceConfig): boolean {
  return !iface.disabled && !iface.radioDisabled;
}

function getWifiStatusMeta(iface: WifiInterfaceConfig): { label: string; color: Color } {
  if (isWifiActive(iface)) {
    return { label: "Active", color: Color.Green };
  }
  if (iface.disabled) {
    return { label: "Disabled", color: Color.SecondaryText };
  }
  return { label: "Radio Disabled", color: Color.SecondaryText };
}

function formatChannelAndHt(iface: WifiInterfaceConfig): string {
  const parts: string[] = [];
  if (iface.channel !== null) {
    parts.push(`Ch ${iface.channel}`);
  }
  if (iface.htmode) {
    parts.push(iface.htmode);
  }
  return parts.length > 0 ? parts.join(" · ") : "Auto / Unknown";
}

function formatEncryptionText(encryption: string, hasKey: boolean): string {
  const normalized = encryption.trim();
  if (!normalized || normalized === "none") {
    return "Open (none)";
  }
  return hasKey ? normalized : `${normalized} (no key)`;
}

function isOpenWifiEncryption(encryption: string): boolean {
  const normalized = encryption.trim().toLowerCase();
  return !normalized || normalized === "none" || normalized === "owe" || normalized.startsWith("owe+");
}

function matchesWifiFilter(iface: WifiInterfaceConfig, filter: WifiFilter): boolean {
  switch (filter) {
    case "active":
      return isWifiActive(iface);
    case "disabled":
      return !isWifiActive(iface);
    default:
      return true;
  }
}

function buildWifiDetailMarkdown(iface: WifiInterfaceConfig): string {
  const ssidTitle = hasVisibleSsid(iface.ssid) ? escapeMarkdownText(iface.ssid) : "*Unnamed SSID*";
  const status = getWifiStatusMeta(iface);
  const summaryParts = [
    `**${status.label}**`,
    `Radio ${inlineCode(iface.device || "unassigned")}`,
    `Mode ${inlineCode(iface.mode || "ap")}`,
    `Network ${inlineCode(iface.network || "unassigned")}`,
  ];

  const lines = [`### ${ssidTitle}`, "", summaryParts.join(" · ")];

  if (iface.radioDisabled) {
    lines.push("", `Radio ${inlineCode(iface.device || "unknown")} is currently disabled in UCI configuration.`);
  } else if (iface.disabled) {
    lines.push("", `Interface ${inlineCode(iface.section)} is currently disabled in UCI configuration.`);
  } else if (iface.hasKey) {
    lines.push("", "Passphrase is fetched on demand for QR code generation or concealed clipboard copy.");
  } else {
    lines.push("", "Open wireless network with no passphrase configured.");
  }

  return lines.join("\n");
}

function buildQrDetailMarkdown(
  iface: WifiInterfaceConfig,
  data: { password: string; payload: string; dataUrl: string } | undefined,
  error: Error | undefined,
): string {
  if (error && !data) {
    const info = getErrorDescription(error);
    return `# ${escapeMarkdownText(info.title)}\n\n${escapeMarkdownText(info.message)}`;
  }

  const visibleSsid = hasVisibleSsid(iface.ssid);
  const ssidTitle = visibleSsid ? escapeMarkdownText(iface.ssid) : "*Unnamed SSID*";
  if (!data) {
    const targetLabel = visibleSsid ? inlineCode(iface.ssid) : "*Unnamed SSID*";
    return `# Wi-Fi QR Code\n\nFetching passphrase and generating QR code for ${targetLabel}...`;
  }

  const status = getWifiStatusMeta(iface);
  return [
    `# ${ssidTitle}`,
    "",
    `![Wi-Fi QR Code](${data.dataUrl})`,
    "",
    `**${status.label}** · Scan with a phone camera to join ${visibleSsid ? inlineCode(iface.ssid) : "this network"}.`,
  ].join("\n");
}

function WifiQrDetail({ iface }: { iface: WifiInterfaceConfig }) {
  const abortable = useRef<AbortController | undefined>(undefined);

  const { data, error, isLoading, revalidate } = usePromise(
    async (section: string) => {
      const live = await fetchWifiQrSection(
        section,
        getPreferenceValues<ExtensionPreferences>(),
        abortable.current?.signal,
      );
      const liveIface: WifiInterfaceConfig = {
        ...iface,
        ssid: live.ssid,
        encryption: live.encryption,
        hidden: live.hidden,
        disabled: live.disabled,
        hasKey: live.password.length > 0,
      };
      const payload = buildWifiQrPayload({
        ssid: live.ssid,
        password: live.password,
        encryption: live.encryption,
        hidden: live.hidden,
      });
      const dataUrl = await generateWifiQrDataUrl(payload);
      return { liveIface, password: live.password, payload, dataUrl };
    },
    [iface.section],
    {
      abortable,
      failureToastOptions: { title: "Failed to load Wi-Fi QR details" },
    },
  );

  const displayIface = data?.liveIface ?? iface;
  const status = getWifiStatusMeta(displayIface);

  const isConfigError =
    error instanceof OpenWrtError &&
    (error.code === "AUTH_FAILED" || error.code === "INVALID_URL" || error.code === "TLS_ERROR");

  const hasErrorOnly = Boolean(error && !data);
  const hasCopyBeforeSsid = Boolean(data?.password || data?.payload);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Wi-Fi QR · ${formatDisplaySsid(displayIface.ssid, displayIface.section)}`}
      markdown={buildQrDetailMarkdown(displayIface, data, error)}
      metadata={
        hasErrorOnly ? undefined : (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item text={status.label} color={status.color} />
              {displayIface.band !== "Unknown" && (
                <Detail.Metadata.TagList.Item text={displayIface.band} color={Color.Blue} />
              )}
              {displayIface.hidden && <Detail.Metadata.TagList.Item text="Hidden" color={Color.SecondaryText} />}
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="SSID" text={formatDisplaySsid(displayIface.ssid)} />
            <Detail.Metadata.Label title="Security" text={displayIface.encryption.trim() || "none"} />
            <Detail.Metadata.Label
              title="Password"
              text={
                data
                  ? data.password
                    ? "•••••••• (Masked)"
                    : isOpenWifiEncryption(displayIface.encryption)
                      ? "Open Network"
                      : "Not configured (Empty Key)"
                  : isLoading
                    ? "Fetching..."
                    : "Unavailable"
              }
            />
            <Detail.Metadata.Label title="Channel" text={formatChannelAndHt(displayIface)} />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          {hasErrorOnly ? (
            <>
              <RouterActionSection
                onRefresh={revalidate}
                showClearCache={false}
                promotePreferences={isConfigError}
                primaryRefresh={!isConfigError}
              />
              {displayIface.ssid && (
                <ActionPanel.Section title="Wi-Fi QR">
                  <Action.CopyToClipboard
                    title="Copy SSID"
                    content={displayIface.ssid}
                    shortcut={Keyboard.Shortcut.Common.CopyName}
                  />
                </ActionPanel.Section>
              )}
            </>
          ) : (
            <>
              {(data?.password || data?.payload || displayIface.ssid) && (
                <ActionPanel.Section title="Wi-Fi QR">
                  {data?.password && (
                    <Action.CopyToClipboard title="Copy Wi-Fi Password" content={data.password} concealed />
                  )}
                  {data?.payload && (
                    <Action.CopyToClipboard
                      title="Copy QR Payload"
                      content={data.payload}
                      concealed
                      shortcut={data.password ? modShortcut(["shift"], "c") : undefined}
                    />
                  )}
                  {displayIface.ssid && (
                    <Action.CopyToClipboard
                      title="Copy SSID"
                      content={displayIface.ssid}
                      shortcut={hasCopyBeforeSsid ? Keyboard.Shortcut.Common.CopyName : undefined}
                    />
                  )}
                </ActionPanel.Section>
              )}
              <RouterActionSection onRefresh={revalidate} showClearCache={false} promotePreferences={isConfigError} />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}

interface ScanSummary {
  band24: number;
  band5: number;
  band6: number;
  onCurrentChannel: number;
}

function buildScanApMarkdown(ap: WifiScanResult, currentChannel: number | null, summary: ScanSummary): string {
  const title = hasVisibleSsid(ap.ssid) ? escapeMarkdownText(ap.ssid) : "*Hidden Network*";
  const isCurrentChannel = currentChannel !== null && ap.channel === currentChannel;
  const channelText =
    ap.channel !== null
      ? `Ch ${ap.channel}${ap.widthMhz ? ` (${ap.widthMhz} MHz)` : ""}${isCurrentChannel ? " — Current Channel" : ""}`
      : "Unknown channel";

  const occupancyRows: string[][] = [
    ["2.4 GHz", String(summary.band24)],
    ["5 GHz", String(summary.band5)],
    ["6 GHz", String(summary.band6)],
  ];
  if (currentChannel !== null) {
    occupancyRows.push([`Current Ch ${currentChannel}`, String(summary.onCurrentChannel)]);
  }

  return [
    `### ${title}`,
    "",
    `${ap.band} · ${channelText} · ${inlineCode(ap.encryption || "Unknown")}`,
    "",
    "#### Channel Occupancy",
    "",
    buildMarkdownTable(["Band / Channel", "Nearby APs"], occupancyRows),
  ].join("\n");
}

function WifiScanList({
  device,
  ssid,
  currentChannel,
}: {
  device: string;
  ssid: string;
  currentChannel: number | null;
}) {
  const abortable = useRef<AbortController | undefined>(undefined);

  const {
    data: results,
    error,
    isLoading,
    revalidate,
  } = usePromise(
    async (dev: string) =>
      scanWifiChannels(dev, getPreferenceValues<ExtensionPreferences>(), abortable.current?.signal),
    [device],
    {
      abortable,
      failureToastOptions: { title: "Failed to scan Wi-Fi channels" },
    },
  );

  const scanResults = useMemo(() => results ?? [], [results]);

  const summary = useMemo<ScanSummary>(() => {
    let band24 = 0;
    let band5 = 0;
    let band6 = 0;
    let onCurrentChannel = 0;

    for (const ap of scanResults) {
      if (ap.band === "2.4 GHz") {
        band24 += 1;
      } else if (ap.band === "5 GHz") {
        band5 += 1;
      } else if (ap.band === "6 GHz") {
        band6 += 1;
      }
      if (currentChannel !== null && ap.channel === currentChannel) {
        onCurrentChannel += 1;
      }
    }

    return { band24, band5, band6, onCurrentChannel };
  }, [scanResults, currentChannel]);

  const summaryParts = [`2.4 GHz: ${summary.band24}`, `5 GHz: ${summary.band5}`, `6 GHz: ${summary.band6}`];
  if (currentChannel !== null) {
    summaryParts.push(`Ch ${currentChannel}: ${summary.onCurrentChannel}`);
  }
  const sectionSubtitle = scanResults.length > 0 ? summaryParts.join(" · ") : undefined;

  const isConfigError =
    error instanceof OpenWrtError &&
    (error.code === "AUTH_FAILED" || error.code === "INVALID_URL" || error.code === "TLS_ERROR");
  const errorInfo = error && scanResults.length === 0 ? getErrorDescription(error) : null;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={scanResults.length > 0}
      navigationTitle={`Channel Scan · ${ssid || device}`}
      searchBarPlaceholder="Filter nearby networks by SSID, BSSID, channel, or encryption..."
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
                showClearCache={false}
                promotePreferences={isConfigError}
                primaryRefresh={!isConfigError}
              />
            </ActionPanel>
          }
        />
      ) : scanResults.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Wifi}
          title="No Nearby Networks Found"
          description={`No neighboring access points were reported on ${device}.`}
          actions={
            <ActionPanel>
              <RouterActionSection onRefresh={revalidate} showClearCache={false} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Nearby Access Points" subtitle={sectionSubtitle}>
          {scanResults.map((ap, idx) => {
            const signalMeta = getSignalMeta(ap.signal);
            const isCurrentChannel = currentChannel !== null && ap.channel === currentChannel;
            const channelTagText = ap.channel !== null ? `Ch ${ap.channel}${isCurrentChannel ? " ★" : ""}` : "Ch ?";
            const channelWidthText =
              ap.channel !== null ? `${ap.channel}${ap.widthMhz ? ` (${ap.widthMhz} MHz)` : ""}` : "Unknown";
            const qualityText = ap.quality !== null && ap.qualityMax ? `${ap.quality}/${ap.qualityMax}` : "Unknown";

            const accessories: List.Item.Accessory[] = [
              {
                tag: {
                  value: channelTagText,
                  color: isCurrentChannel ? Color.Blue : Color.SecondaryText,
                },
              },
              {
                tag: {
                  value: ap.signal !== null ? `${ap.signal} dBm` : "Unknown",
                  color: signalMeta.color,
                },
              },
            ];

            return (
              <List.Item
                key={`${ap.bssid}-${ap.channel ?? "x"}-${idx}`}
                icon={{ source: Icon.Wifi, tintColor: signalMeta.color }}
                title={formatDisplaySsid(ap.ssid, "(hidden)")}
                subtitle={ap.bssid}
                keywords={[
                  ap.ssid || "hidden",
                  ap.bssid,
                  ap.band,
                  ap.channel !== null ? `ch ${ap.channel}` : "",
                  ap.encryption,
                ].filter(Boolean)}
                accessories={accessories}
                detail={
                  <List.Item.Detail
                    markdown={buildScanApMarkdown(ap, currentChannel, summary)}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.TagList title="Signal">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={ap.signal !== null ? `${ap.signal} dBm (${signalMeta.label})` : "Unknown"}
                            color={signalMeta.color}
                          />
                          {isCurrentChannel && (
                            <List.Item.Detail.Metadata.TagList.Item text="Current Channel" color={Color.Blue} />
                          )}
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.Label title="SSID" text={formatDisplaySsid(ap.ssid, "(hidden)")} />
                        <List.Item.Detail.Metadata.Label title="BSSID" text={ap.bssid} />
                        <List.Item.Detail.Metadata.Label title="Band" text={ap.band} />
                        <List.Item.Detail.Metadata.Label title="Channel" text={channelWidthText} />
                        {ap.mhz !== null && (
                          <List.Item.Detail.Metadata.Label title="Frequency" text={`${ap.mhz} MHz`} />
                        )}
                        <List.Item.Detail.Metadata.Label title="Quality" text={qualityText} />
                        <List.Item.Detail.Metadata.Label title="Encryption" text={ap.encryption || "Unknown"} />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Access Point">
                      <Action.CopyToClipboard title="Copy BSSID" content={ap.bssid} />
                      {ap.ssid && (
                        <Action.CopyToClipboard
                          title="Copy SSID"
                          content={ap.ssid}
                          shortcut={Keyboard.Shortcut.Common.CopyName}
                        />
                      )}
                    </ActionPanel.Section>
                    <RouterActionSection onRefresh={revalidate} showClearCache={false} />
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

export default function WifiManagerCommand() {
  const [filter, setFilter] = useState<WifiFilter>("all");

  const {
    data: configs,
    error,
    isLoading,
    isCached,
    updatedAt,
    revalidate,
  } = useCachedOpenWrtData("wifi-configs", (signal) =>
    fetchWifiConfigs(getPreferenceValues<ExtensionPreferences>(), signal),
  );

  const allConfigs = useMemo(() => configs ?? [], [configs]);
  const filteredConfigs = useMemo(
    () => allConfigs.filter((iface) => matchesWifiFilter(iface, filter)),
    [allConfigs, filter],
  );

  async function handleCopyPassword(iface: WifiInterfaceConfig) {
    const label = formatDisplaySsid(iface.ssid, iface.section);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Fetching Password for ${label}...`,
    });

    try {
      const passphrase = await fetchWifiPassphrase(iface.section, getPreferenceValues<ExtensionPreferences>());
      if (!passphrase) {
        toast.style = Toast.Style.Failure;
        toast.title = "No Password Configured";
        toast.message = `${label} is an open network without a passphrase.`;
        return;
      }

      await Clipboard.copy(passphrase, { concealed: true });
      toast.style = Toast.Style.Success;
      toast.title = "Wi-Fi Password Copied";
      toast.message = `Copied concealed passphrase for ${label}`;
    } catch (err) {
      await toast.hide();
      const { title, message } = getErrorDescription(err);
      await showFailureToast(message, { title });
    }
  }

  async function handleToggleSsid(iface: WifiInterfaceConfig) {
    const nextDisabled = !iface.disabled;
    const label = formatDisplaySsid(iface.ssid, iface.section);

    if (nextDisabled) {
      const confirmed = await confirmAlert({
        title: `Disable ${label}?`,
        message: "Disabling this SSID will disconnect any wireless clients currently connected to it.",
        primaryAction: {
          title: "Disable SSID",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!confirmed) {
        return;
      }
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: nextDisabled ? `Disabling ${label}...` : `Enabling ${label}...`,
    });

    try {
      await setWifiSectionDisabled(iface.section, nextDisabled, getPreferenceValues<ExtensionPreferences>());
      toast.style = Toast.Style.Success;
      toast.title = nextDisabled ? "SSID Disabled" : "SSID Enabled";
      toast.message = `${label} updated and Wi-Fi reloaded`;
      await delay(600);
      void revalidate();
    } catch (err) {
      await toast.hide();
      const { title, message } = getErrorDescription(err);
      await showFailureToast(message, { title });
    }
  }

  async function handleToggleRadio(iface: WifiInterfaceConfig) {
    if (!iface.device) {
      return;
    }

    const nextDisabled = !iface.radioDisabled;
    const confirmed = await confirmAlert({
      title: `${nextDisabled ? "Disable" : "Enable"} Radio ${iface.device}?`,
      message: nextDisabled
        ? `Disabling radio ${iface.device} will take down all SSIDs and disconnect all clients on this radio.`
        : `Enable radio ${iface.device} and reload wireless configuration.`,
      primaryAction: {
        title: nextDisabled ? "Disable Radio" : "Enable Radio",
        style: nextDisabled ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
      },
    });
    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: nextDisabled ? `Disabling ${iface.device}...` : `Enabling ${iface.device}...`,
    });

    try {
      await setWifiSectionDisabled(iface.device, nextDisabled, getPreferenceValues<ExtensionPreferences>());
      toast.style = Toast.Style.Success;
      toast.title = nextDisabled ? "Radio Disabled" : "Radio Enabled";
      toast.message = `${iface.device} updated and Wi-Fi reloaded`;
      await delay(600);
      void revalidate();
    } catch (err) {
      await toast.hide();
      const { title, message } = getErrorDescription(err);
      await showFailureToast(message, { title });
    }
  }

  const activeCount = useMemo(() => allConfigs.filter(isWifiActive).length, [allConfigs]);
  const cacheBadge = formatCacheBadge({ isCached, isLoading, error, updatedAt });
  const countsText = allConfigs.length > 0 ? `${activeCount} active · ${allConfigs.length} total` : "";
  const sectionSubtitle = [cacheBadge, countsText].filter(Boolean).join(" · ") || undefined;

  const isConfigError =
    error instanceof OpenWrtError &&
    (error.code === "AUTH_FAILED" || error.code === "INVALID_URL" || error.code === "TLS_ERROR");
  const errorInfo = error && allConfigs.length === 0 ? getErrorDescription(error) : null;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={filteredConfigs.length > 0}
      searchBarPlaceholder="Search SSIDs, radio devices, bands, or encryption..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Wi-Fi Interfaces"
          value={filter}
          onChange={(value) => setFilter(value as WifiFilter)}
        >
          <List.Dropdown.Item title="All Interfaces" value="all" />
          <List.Dropdown.Item title="Active SSIDs" value="active" />
          <List.Dropdown.Item title="Disabled SSIDs" value="disabled" />
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
      ) : filteredConfigs.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Wifi}
          title="No Matching Wi-Fi Interfaces"
          description="No wireless SSIDs matched the current filter or router configuration."
          actions={
            <ActionPanel>
              <RouterActionSection onRefresh={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Wi-Fi Interfaces" subtitle={sectionSubtitle}>
          {filteredConfigs.map((iface) => {
            const active = isWifiActive(iface);
            const status = getWifiStatusMeta(iface);
            const channelHt = formatChannelAndHt(iface);
            const encryptionText = formatEncryptionText(iface.encryption, iface.hasKey);
            const bitrateText = formatBitrateKbps(iface.bitrateKbps);
            const radioLabel = iface.device
              ? `${iface.device}${iface.radioDisabled ? " (Disabled)" : ""}`
              : "Unassigned";

            const accessories: List.Item.Accessory[] = [];
            if (active && iface.liveDevice) {
              accessories.push({
                text: `${iface.stationCount} ${iface.stationCount === 1 ? "client" : "clients"}`,
              });
            }
            accessories.push({
              tag: {
                value: status.label,
                color: status.color,
              },
            });

            return (
              <List.Item
                key={iface.section}
                id={iface.section}
                icon={{ source: active ? Icon.Wifi : Icon.WifiDisabled, tintColor: status.color }}
                title={formatDisplaySsid(iface.ssid, "(Unnamed SSID)")}
                subtitle={iface.band !== "Unknown" ? iface.band : iface.device}
                keywords={[
                  iface.ssid,
                  iface.section,
                  iface.device,
                  iface.liveDevice ?? "",
                  iface.band,
                  iface.encryption,
                  iface.network,
                  iface.mode,
                  status.label,
                ].filter(Boolean)}
                accessories={accessories}
                detail={
                  <List.Item.Detail
                    markdown={buildWifiDetailMarkdown(iface)}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.TagList title="Status">
                          <List.Item.Detail.Metadata.TagList.Item text={status.label} color={status.color} />
                          {iface.band !== "Unknown" && (
                            <List.Item.Detail.Metadata.TagList.Item text={iface.band} color={Color.Blue} />
                          )}
                          {iface.hidden && (
                            <List.Item.Detail.Metadata.TagList.Item text="Hidden" color={Color.SecondaryText} />
                          )}
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.Label title="SSID" text={formatDisplaySsid(iface.ssid)} />
                        <List.Item.Detail.Metadata.Label title="Radio" text={radioLabel} />
                        <List.Item.Detail.Metadata.Label title="Band" text={iface.band} />
                        <List.Item.Detail.Metadata.Label title="Channel / HT Mode" text={channelHt} />
                        <List.Item.Detail.Metadata.Label title="Encryption" text={encryptionText} />
                        <List.Item.Detail.Metadata.Label title="Live Device" text={iface.liveDevice || "Not active"} />
                        <List.Item.Detail.Metadata.Label title="Station Count" text={String(iface.stationCount)} />
                        <List.Item.Detail.Metadata.Label title="Bitrate" text={bitrateText} />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="UCI Section" text={iface.section} />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Wi-Fi">
                      <Action.Push
                        title="Show Wi-Fi QR Code"
                        icon={Icon.BarCode}
                        target={<WifiQrDetail iface={iface} />}
                      />
                      <Action
                        title="Copy Wi-Fi Password"
                        icon={Icon.Key}
                        shortcut={modShortcut(["shift"], "p")}
                        onAction={() => handleCopyPassword(iface)}
                      />
                      {iface.ssid && (
                        <Action.CopyToClipboard
                          title="Copy SSID"
                          content={iface.ssid}
                          shortcut={Keyboard.Shortcut.Common.CopyName}
                        />
                      )}
                      {iface.liveDevice && (
                        <Action.Push
                          title="Scan Nearby Channels"
                          icon={Icon.MagnifyingGlass}
                          shortcut={modShortcut(["shift"], "s")}
                          target={
                            <WifiScanList device={iface.liveDevice} ssid={iface.ssid} currentChannel={iface.channel} />
                          }
                        />
                      )}
                      <Action
                        title={iface.disabled ? "Enable SSID" : "Disable SSID"}
                        icon={iface.disabled ? Icon.CheckCircle : Icon.XMarkCircle}
                        style={iface.disabled ? Action.Style.Regular : Action.Style.Destructive}
                        onAction={() => handleToggleSsid(iface)}
                      />
                      {iface.device && (
                        <Action
                          title={
                            iface.radioDisabled ? `Enable Radio (${iface.device})` : `Disable Radio (${iface.device})`
                          }
                          icon={iface.radioDisabled ? Icon.Wifi : Icon.WifiDisabled}
                          style={iface.radioDisabled ? Action.Style.Regular : Action.Style.Destructive}
                          onAction={() => handleToggleRadio(iface)}
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
