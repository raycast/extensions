import { useMemo, useState } from "react";
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
import { showFailureToast } from "@raycast/utils";
import { RouterActionSection } from "./components/CommonActions";
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
import { fetchActiveConnections, fetchProcessList, signalRouterProcess } from "./lib/openwrt-extras";
import type { ConntrackEntry, ExtensionPreferences, RouterProcessEntry } from "./lib/types";
import { OpenWrtError, getErrorDescription } from "./lib/ubus";

type ViewMode = "conntrack-bytes" | "conntrack-tcp" | "conntrack-udp" | "proc-cpu" | "proc-mem";

type ConnectionsOrProcessesSnapshot =
  { kind: "conntrack"; entries: ConntrackEntry[] } | { kind: "processes"; entries: RouterProcessEntry[] };

const MAX_CONNTRACK_ITEMS = 200;

function getProtocolColor(layer4: string): Color {
  switch (layer4.toLowerCase()) {
    case "udp":
      return Color.Blue;
    default:
      return Color.SecondaryText;
  }
}

function getCpuColor(cpuPercent: number): Color {
  if (cpuPercent >= 50) {
    return Color.Red;
  }
  if (cpuPercent >= 15) {
    return Color.Yellow;
  }
  return Color.SecondaryText;
}

function getMemoryColor(memPercent: number): Color {
  if (memPercent >= 50) {
    return Color.Red;
  }
  if (memPercent >= 25) {
    return Color.Yellow;
  }
  return Color.SecondaryText;
}

function formatEndpointLabel(host: string | null, ip: string, port: number | null): string {
  const base = host || ip;
  return port !== null ? `${base}:${port}` : base;
}

function formatEndpointTableCell(host: string | null, ip: string, port: number | null): string {
  const ipPart = inlineCode(port !== null ? `${ip}:${port}` : ip);
  return host ? `${escapeMarkdownText(host)} (${ipPart})` : ipPart;
}

function buildConnectionSummary(entry: ConntrackEntry): string {
  const src = entry.sport !== null ? `${entry.src}:${entry.sport}` : entry.src;
  const dst = entry.dport !== null ? `${entry.dst}:${entry.dport}` : entry.dst;
  return `${entry.layer4.toUpperCase()} ${src} -> ${dst} | ${formatBytes(entry.bytes)} (${entry.packets} pkts) | TTL ${formatDuration(entry.timeout)}`;
}

function buildConnectionMarkdown(entry: ConntrackEntry): string {
  const heading = `${escapeMarkdownText(entry.srcHost || entry.src)} -> ${escapeMarkdownText(formatEndpointLabel(entry.dstHost, entry.dst, entry.dport))}`;
  const rows: Array<[string, string]> = [
    ["Source", formatEndpointTableCell(entry.srcHost, entry.src, entry.sport)],
    ["Destination", formatEndpointTableCell(entry.dstHost, entry.dst, entry.dport)],
    ["Protocol", `${inlineCode(entry.layer4.toUpperCase())} (${inlineCode(entry.layer3.toUpperCase())})`],
    ["Traffic", `${formatBytes(entry.bytes)} (${entry.packets.toLocaleString()} packets)`],
    ["Timeout", formatDuration(entry.timeout)],
  ];

  return [`### ${heading}`, "", buildKeyValueTable(rows, "Field", "Value")].join("\n");
}

function buildProcessMarkdown(proc: RouterProcessEntry): string {
  const isProtected = proc.pid <= 1 || proc.command.startsWith("[");
  const heading = isProtected
    ? `### Process ${inlineCode(String(proc.pid))} (Protected)`
    : `### Process ${inlineCode(String(proc.pid))}`;

  return [heading, "", "#### Command Line", "", buildSafeCodeBlock(proc.command, "bash")].join("\n");
}

function matchesConntrackSearch(entry: ConntrackEntry, query: string): boolean {
  if (!query) {
    return true;
  }
  const fields = [
    entry.src,
    entry.dst,
    entry.srcHost ?? "",
    entry.dstHost ?? "",
    entry.layer4,
    entry.layer3,
    entry.sport !== null ? String(entry.sport) : "",
    entry.dport !== null ? String(entry.dport) : "",
  ];
  return fields.some((field) => field.toLowerCase().includes(query));
}

function matchesProcessSearch(proc: RouterProcessEntry, query: string): boolean {
  if (!query) {
    return true;
  }
  return (
    proc.command.toLowerCase().includes(query) ||
    proc.user.toLowerCase().includes(query) ||
    String(proc.pid).includes(query) ||
    proc.stat.toLowerCase().includes(query)
  );
}

export default function ConnectionsProcessesCommand() {
  const [mode, setMode] = useState<ViewMode>("conntrack-bytes");
  const [searchText, setSearchText] = useState("");
  const isProcessMode = mode.startsWith("proc-");

  const {
    data: snapshot,
    error,
    isLoading,
    isCached,
    isStale,
    updatedAt,
    revalidate,
  } = useCachedOpenWrtData<ConnectionsOrProcessesSnapshot>(
    isProcessMode ? "processes" : "conntrack",
    async (signal) => {
      const prefs = getPreferenceValues<ExtensionPreferences>();
      if (isProcessMode) {
        return {
          kind: "processes",
          entries: await fetchProcessList(prefs, signal),
        };
      }
      return {
        kind: "conntrack",
        entries: await fetchActiveConnections(prefs, signal),
      };
    },
  );

  const normalizedQuery = searchText.trim().toLowerCase();

  const conntrackResult = useMemo(() => {
    if (!snapshot || snapshot.kind !== "conntrack") {
      return { visible: [] as ConntrackEntry[], totalMatching: 0, totalFetched: 0 };
    }

    const protoFiltered = snapshot.entries.filter((entry) => {
      const proto = entry.layer4.toLowerCase();
      if (mode === "conntrack-tcp") {
        return proto === "tcp";
      }
      if (mode === "conntrack-udp") {
        return proto === "udp";
      }
      return true;
    });

    const searched = normalizedQuery
      ? protoFiltered.filter((entry) => matchesConntrackSearch(entry, normalizedQuery))
      : protoFiltered;

    return {
      visible: searched.slice(0, MAX_CONNTRACK_ITEMS),
      totalMatching: searched.length,
      totalFetched: snapshot.entries.length,
    };
  }, [snapshot, mode, normalizedQuery]);

  const processResult = useMemo(() => {
    if (!snapshot || snapshot.kind !== "processes") {
      return { visible: [] as RouterProcessEntry[], totalFetched: 0 };
    }

    const sorted = [...snapshot.entries].sort((a, b) => {
      if (mode === "proc-mem") {
        return b.memPercent - a.memPercent || b.vszBytes - a.vszBytes || b.cpuPercent - a.cpuPercent;
      }
      return b.cpuPercent - a.cpuPercent || b.memPercent - a.memPercent || b.vszBytes - a.vszBytes;
    });

    const visible = normalizedQuery ? sorted.filter((proc) => matchesProcessSearch(proc, normalizedQuery)) : sorted;
    return {
      visible,
      totalFetched: snapshot.entries.length,
    };
  }, [snapshot, mode, normalizedQuery]);

  async function handleSignalProcess(proc: RouterProcessEntry, sig: "TERM" | "KILL") {
    const confirmed = await confirmAlert({
      title: sig === "KILL" ? `Force Kill PID ${proc.pid}?` : `Send SIGTERM to PID ${proc.pid}?`,
      message: `${sig === "KILL" ? "Immediately terminate" : "Gracefully stop"} "${proc.command}". Stopping critical router daemons may disrupt network connectivity.`,
      primaryAction: {
        title: sig === "KILL" ? "Force Kill (SIGKILL)" : "Send SIGTERM",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Sending SIG${sig} to PID ${proc.pid}...`,
    });
    try {
      await signalRouterProcess(proc.pid, sig, getPreferenceValues<ExtensionPreferences>());
      toast.style = Toast.Style.Success;
      toast.title = "Signal Sent";
      toast.message = `SIG${sig} delivered to PID ${proc.pid}`;
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      void revalidate();
    } catch (err) {
      await toast.hide();
      const { title, message } = getErrorDescription(err);
      await showFailureToast(message, { title });
    }
  }

  const activeItemsCount = isProcessMode ? processResult.visible.length : conntrackResult.visible.length;
  const totalFetchedCount = isProcessMode ? processResult.totalFetched : conntrackResult.totalFetched;

  const cacheBadge = formatCacheBadge({ isCached, isLoading, error, updatedAt });
  const countsText = isProcessMode
    ? totalFetchedCount > 0
      ? `${processResult.visible.length} of ${totalFetchedCount} processes`
      : ""
    : conntrackResult.totalMatching > MAX_CONNTRACK_ITEMS
      ? `Top ${MAX_CONNTRACK_ITEMS} of ${conntrackResult.totalMatching} matching flows`
      : conntrackResult.totalFetched > 0
        ? `${conntrackResult.visible.length} of ${conntrackResult.totalFetched} flows`
        : "";
  const sectionSubtitle = [cacheBadge, countsText].filter(Boolean).join(" · ") || undefined;

  const navigationTitle =
    isLoading && isStale
      ? "Connections & Processes · Updating..."
      : isStale
        ? error
          ? "Connections & Processes · Offline (Cached)"
          : "Connections & Processes · Cached"
        : "Connections & Processes";

  const isConfigError =
    error instanceof OpenWrtError &&
    (error.code === "AUTH_FAILED" || error.code === "INVALID_URL" || error.code === "TLS_ERROR");
  const errorInfo = error && totalFetchedCount === 0 ? getErrorDescription(error) : null;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      isShowingDetail={activeItemsCount > 0}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={
        isProcessMode
          ? "Filter processes by command, user, PID, or state..."
          : "Filter connections by host, IP, port, or protocol..."
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="View Mode"
          value={mode}
          onChange={(value) => {
            const nextMode = value as ViewMode;
            if (nextMode.startsWith("proc-") !== isProcessMode) {
              setSearchText("");
            }
            setMode(nextMode);
          }}
        >
          <List.Dropdown.Item title="Active Connections (Top Traffic)" value="conntrack-bytes" />
          <List.Dropdown.Item title="Active Connections (TCP)" value="conntrack-tcp" />
          <List.Dropdown.Item title="Active Connections (UDP)" value="conntrack-udp" />
          <List.Dropdown.Item title="Top Processes (by CPU)" value="proc-cpu" />
          <List.Dropdown.Item title="Top Processes (by Memory)" value="proc-mem" />
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
              <RouterActionSection onRefresh={revalidate} promotePreferences={isConfigError} />
            </ActionPanel>
          }
        />
      ) : activeItemsCount === 0 && !isLoading ? (
        <List.EmptyView
          icon={isProcessMode ? Icon.Terminal : Icon.Network}
          title={isProcessMode ? "No Matching Processes" : "No Matching Connections"}
          description={
            normalizedQuery
              ? "Try clearing or broadening your search query."
              : isProcessMode
                ? "No router processes were returned."
                : "No active conntrack NAT flows matched the selected filter."
          }
          actions={
            <ActionPanel>
              {normalizedQuery && (
                <Action title="Clear Search" icon={Icon.XMarkCircle} onAction={() => setSearchText("")} />
              )}
              <RouterActionSection onRefresh={revalidate} />
            </ActionPanel>
          }
        />
      ) : isProcessMode ? (
        <List.Section
          title={mode === "proc-mem" ? "Top Processes (Memory)" : "Top Processes (CPU)"}
          subtitle={sectionSubtitle}
        >
          {processResult.visible.map((proc) => {
            const isProtected = proc.pid <= 1 || proc.command.startsWith("[");
            const cpuColor = getCpuColor(proc.cpuPercent);
            const memColor = getMemoryColor(proc.memPercent);

            return (
              <List.Item
                key={`proc-${proc.pid}`}
                id={`proc-${proc.pid}`}
                icon={
                  isProtected
                    ? { source: Icon.Lock, tintColor: Color.SecondaryText }
                    : { source: Icon.Terminal, tintColor: cpuColor }
                }
                title={proc.command}
                subtitle={`PID ${proc.pid} · ${proc.user}`}
                accessories={[
                  { tag: { value: `CPU ${proc.cpuPercent.toFixed(1)}%`, color: cpuColor } },
                  { tag: { value: `MEM ${proc.memPercent.toFixed(1)}%`, color: memColor } },
                ]}
                detail={
                  <List.Item.Detail
                    markdown={buildProcessMarkdown(proc)}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="PID" text={String(proc.pid)} />
                        <List.Item.Detail.Metadata.Label title="Parent PID" text={String(proc.ppid)} />
                        <List.Item.Detail.Metadata.Label title="User" text={proc.user} />
                        <List.Item.Detail.Metadata.Label title="State" text={proc.stat} />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.TagList title="CPU">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={`${proc.cpuPercent.toFixed(1)}%`}
                            color={cpuColor}
                          />
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.TagList title="Memory">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={`${proc.memPercent.toFixed(1)}%`}
                            color={memColor}
                          />
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.Label title="VSZ" text={formatBytes(proc.vszBytes)} />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Process">
                      <Action.CopyToClipboard title="Copy Command" content={proc.command} />
                      <Action.CopyToClipboard
                        title="Copy PID"
                        content={String(proc.pid)}
                        shortcut={modShortcut(["shift"], "c")}
                      />
                    </ActionPanel.Section>
                    {!isProtected && (
                      <ActionPanel.Section title="Signal">
                        <Action
                          title="Send SIGTERM"
                          icon={Icon.Stop}
                          style={Action.Style.Destructive}
                          onAction={() => handleSignalProcess(proc, "TERM")}
                        />
                        <Action
                          title="Force Kill (SIGKILL)"
                          icon={Icon.XMarkCircle}
                          style={Action.Style.Destructive}
                          onAction={() => handleSignalProcess(proc, "KILL")}
                        />
                      </ActionPanel.Section>
                    )}
                    <RouterActionSection onRefresh={revalidate} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : (
        <List.Section title="Active Connections" subtitle={sectionSubtitle}>
          {conntrackResult.visible.map((entry) => {
            const protoColor = getProtocolColor(entry.layer4);
            const destinationTarget = entry.dport !== null ? `${entry.dst}:${entry.dport}` : entry.dst;
            const title = `${entry.srcHost || entry.src} -> ${formatEndpointLabel(entry.dstHost, entry.dst, entry.dport)}`;

            return (
              <List.Item
                key={entry.id}
                id={entry.id}
                icon={{ source: Icon.Network, tintColor: protoColor }}
                title={title}
                subtitle={`${formatBytes(entry.bytes)} · ${entry.packets} pkts`}
                accessories={[
                  { tag: { value: entry.layer4.toUpperCase(), color: protoColor } },
                  { text: formatDuration(entry.timeout) },
                ]}
                detail={
                  <List.Item.Detail
                    markdown={buildConnectionMarkdown(entry)}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.TagList title="Protocol">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={entry.layer4.toUpperCase()}
                            color={protoColor}
                          />
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.Label title="Source IP" text={entry.src} />
                        {entry.srcHost && <List.Item.Detail.Metadata.Label title="Source Host" text={entry.srcHost} />}
                        {entry.sport !== null && (
                          <List.Item.Detail.Metadata.Label title="Source Port" text={String(entry.sport)} />
                        )}
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Destination IP" text={entry.dst} />
                        {entry.dstHost && (
                          <List.Item.Detail.Metadata.Label title="Destination Host" text={entry.dstHost} />
                        )}
                        {entry.dport !== null && (
                          <List.Item.Detail.Metadata.Label title="Destination Port" text={String(entry.dport)} />
                        )}
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Bytes" text={formatBytes(entry.bytes)} />
                        <List.Item.Detail.Metadata.Label title="Packets" text={entry.packets.toLocaleString()} />
                        <List.Item.Detail.Metadata.Label title="Timeout" text={formatDuration(entry.timeout)} />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Connection">
                      <Action.CopyToClipboard title="Copy Destination" content={destinationTarget} />
                      <Action.CopyToClipboard title="Copy Source IP" content={entry.src} />
                      <Action.CopyToClipboard
                        title="Copy Destination IP"
                        content={entry.dst}
                        shortcut={modShortcut(["shift"], "c")}
                      />
                      <Action.CopyToClipboard title="Copy Connection Summary" content={buildConnectionSummary(entry)} />
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
