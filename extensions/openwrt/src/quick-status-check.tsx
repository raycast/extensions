import { useMemo, useState } from "react";
import { Action, ActionPanel, Color, Icon, Keyboard, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { RouterActionSection } from "./components/CommonActions";
import { useCachedOpenWrtData } from "./lib/cache";
import { escapeMarkdownText, formatCacheBadge, inlineCode, modShortcut } from "./lib/format";
import {
  dnsLookupFromRouter,
  formatDnsMarkdown,
  formatPingMarkdown,
  pingFromRouter,
  runQuickStatusChecks,
  validateTargetHost,
} from "./lib/openwrt";
import type { ExtensionPreferences, StatusCheckItem } from "./lib/types";
import { OpenWrtError, getErrorDescription } from "./lib/ubus";

const CATEGORY_LABELS: Record<StatusCheckItem["category"], string> = {
  router: "Router",
  network: "Network",
  services: "Services",
  wifi: "Wi-Fi",
  dns: "DNS",
  ping: "Ping",
};

function getStatusIcon(status: StatusCheckItem["status"]): { source: Icon; tintColor: Color } {
  switch (status) {
    case "pass":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "warn":
      return { source: Icon.ExclamationMark, tintColor: Color.Yellow };
    default:
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }
}

function getStatusLabel(status: StatusCheckItem["status"]): { text: string; color: Color } {
  switch (status) {
    case "pass":
      return { text: "Healthy", color: Color.Green };
    case "warn":
      return { text: "Warning", color: Color.Yellow };
    default:
      return { text: "Failed", color: Color.Red };
  }
}

function isValidAdHocHost(raw: string): boolean {
  try {
    validateTargetHost(raw);
    return raw.trim().length > 0;
  } catch {
    return false;
  }
}

export default function QuickStatusCheckCommand() {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [adHocResults, setAdHocResults] = useState<StatusCheckItem[]>([]);

  const variant = `${prefs.pingTargets ?? ""}|${prefs.dnsTestDomain ?? ""}|${prefs.pinnedServices ?? ""}`;
  const {
    data: checks,
    error,
    isLoading,
    isCached,
    isStale,
    updatedAt,
    revalidate,
  } = useCachedOpenWrtData(
    "quick-checks",
    (signal) => runQuickStatusChecks(getPreferenceValues<ExtensionPreferences>(), signal),
    { variant },
  );

  const allChecks = useMemo(() => [...adHocResults, ...(checks ?? [])], [adHocResults, checks]);
  const trimmedSearch = searchText.trim();
  const canProbeAdHoc = isValidAdHocHost(trimmedSearch);

  const fullReport = useMemo(() => {
    return allChecks.map((item) => `[${item.status.toUpperCase()}] ${item.title}: ${item.summary}`).join("\n");
  }, [allChecks]);

  async function handleAdHocPing(target: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Pinging ${target}...`,
    });
    try {
      const res = await pingFromRouter(target, 4, getPreferenceValues<ExtensionPreferences>());
      const status: StatusCheckItem["status"] = !res.reachable ? "fail" : res.lossPercent > 0 ? "warn" : "pass";
      const id = `adhoc:ping:${target}`;
      const entry: StatusCheckItem = {
        id,
        title: `Ping ${target}`,
        category: "ping",
        status,
        summary: res.reachable
          ? `${res.received}/${res.transmitted} rx · ${res.lossPercent}% loss${res.avgMs !== null ? ` · avg ${res.avgMs.toFixed(1)} ms` : ""}`
          : `Unreachable (${res.lossPercent}% loss)`,
        latencyMs: res.avgMs !== null ? Math.round(res.avgMs) : null,
        target,
        detailMarkdown: formatPingMarkdown(`Ad-hoc Ping: ${escapeMarkdownText(target)}`, res),
      };
      setAdHocResults((prev) => [entry, ...prev.filter((item) => item.id !== id)]);
      setSearchText("");
      setSelectedId(id);
      toast.style = res.reachable ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = res.reachable ? `${target} Reachable` : `${target} Unreachable`;
      toast.message = entry.summary;
    } catch (err) {
      await toast.hide();
      const { title, message } = getErrorDescription(err);
      await showFailureToast(message, { title });
    }
  }

  async function handleAdHocDns(domain: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Resolving ${domain}...`,
    });
    try {
      const res = await dnsLookupFromRouter(domain, getPreferenceValues<ExtensionPreferences>());
      const id = `adhoc:dns:${domain}`;
      const entry: StatusCheckItem = {
        id,
        title: `DNS Lookup (${domain})`,
        category: "dns",
        status: res.resolved ? "pass" : "fail",
        summary: res.resolved
          ? `${res.addresses.slice(0, 2).join(", ")} (${res.latencyMs} ms)`
          : `Failed to resolve ${domain}`,
        latencyMs: res.latencyMs,
        target: domain,
        detailMarkdown: formatDnsMarkdown(`Ad-hoc DNS Lookup: ${inlineCode(domain)}`, res),
      };
      setAdHocResults((prev) => [entry, ...prev.filter((item) => item.id !== id)]);
      setSearchText("");
      setSelectedId(id);
      toast.style = res.resolved ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = res.resolved ? `${domain} Resolved` : `DNS Lookup Failed`;
      toast.message = entry.summary;
    } catch (err) {
      await toast.hide();
      const { title, message } = getErrorDescription(err);
      await showFailureToast(message, { title });
    }
  }

  const passCount = allChecks.filter((c) => c.status === "pass").length;
  const warnCount = allChecks.filter((c) => c.status === "warn").length;
  const failCount = allChecks.filter((c) => c.status === "fail").length;
  const cacheBadge = formatCacheBadge({ isCached, isLoading, error, updatedAt });
  const countsText =
    allChecks.length > 0
      ? `${passCount} healthy${warnCount > 0 ? ` · ${warnCount} warn` : ""}${failCount > 0 ? ` · ${failCount} failed` : ""}`
      : "";
  const summarySubtitle = [cacheBadge, countsText].filter(Boolean).join(" · ") || undefined;

  const navigationTitle =
    isLoading && isStale
      ? "Quick Status Check · Updating..."
      : isStale
        ? error
          ? "Quick Status Check · Offline (Cached)"
          : "Quick Status Check · Cached"
        : "Quick Status Check";

  const isConfigError =
    error instanceof OpenWrtError &&
    (error.code === "AUTH_FAILED" || error.code === "INVALID_URL" || error.code === "TLS_ERROR");
  const errorInfo = error && allChecks.length === 0 ? getErrorDescription(error) : null;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      isShowingDetail={allChecks.length > 0 || canProbeAdHoc}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      searchBarPlaceholder="Type an IP or domain to probe from your router (e.g. 192.168.1.50 or example.com)..."
    >
      {canProbeAdHoc && (
        <List.Section title="Ad-hoc Router Probe">
          <List.Item
            key={`probe:ping:${trimmedSearch}`}
            id={`probe:ping:${trimmedSearch}`}
            icon={{ source: Icon.Network, tintColor: Color.Blue }}
            title={`Ping ${trimmedSearch} from Router`}
            subtitle="4 ICMP packets"
            detail={
              <List.Item.Detail
                markdown={`### Ping ${escapeMarkdownText(trimmedSearch)}\n\nPress **Enter** to send 4 ICMP echo requests directly from your OpenWrt router.`}
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Probe">
                  <Action
                    title={`Ping ${trimmedSearch}`}
                    icon={Icon.Play}
                    onAction={() => handleAdHocPing(trimmedSearch)}
                  />
                  <Action
                    title="Rerun All Checks"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                </ActionPanel.Section>
                <RouterActionSection />
              </ActionPanel>
            }
          />
          <List.Item
            key={`probe:dns:${trimmedSearch}`}
            id={`probe:dns:${trimmedSearch}`}
            icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Purple }}
            title={`DNS Lookup ${trimmedSearch} via Router`}
            subtitle="Query 127.0.0.1"
            detail={
              <List.Item.Detail
                markdown={`### Local DNS Lookup\n\nPress **Enter** to query ${inlineCode(trimmedSearch)} against the router's local DNS resolver (${inlineCode("127.0.0.1")}).`}
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Probe">
                  <Action
                    title={`Resolve ${trimmedSearch}`}
                    icon={Icon.Play}
                    onAction={() => handleAdHocDns(trimmedSearch)}
                  />
                  <Action
                    title="Rerun All Checks"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                </ActionPanel.Section>
                <RouterActionSection />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {!canProbeAdHoc && errorInfo ? (
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
      ) : !canProbeAdHoc && allChecks.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Heartbeat}
          title="No Status Checks"
          description="Press Refresh to run quick health checks on your OpenWrt router."
          actions={
            <ActionPanel>
              <RouterActionSection onRefresh={revalidate} />
            </ActionPanel>
          }
        />
      ) : allChecks.length > 0 ? (
        <List.Section title="Quick Status Checks" subtitle={summarySubtitle}>
          {allChecks.map((item) => {
            const statusLabel = getStatusLabel(item.status);
            const showLatencyTag = item.latencyMs !== null && !(item.category === "router" && item.status !== "pass");
            return (
              <List.Item
                key={item.id}
                id={item.id}
                icon={getStatusIcon(item.status)}
                title={item.title}
                subtitle={item.summary}
                accessories={[
                  {
                    tag: {
                      value: showLatencyTag ? `${item.latencyMs} ms` : statusLabel.text,
                      color: statusLabel.color,
                    },
                  },
                ]}
                detail={
                  <List.Item.Detail
                    markdown={item.detailMarkdown}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.TagList title="Result">
                          <List.Item.Detail.Metadata.TagList.Item text={statusLabel.text} color={statusLabel.color} />
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.Label title="Category" text={CATEGORY_LABELS[item.category]} />
                        {item.target && <List.Item.Detail.Metadata.Label title="Target" text={item.target} />}
                        {item.latencyMs !== null && (
                          <List.Item.Detail.Metadata.Label title="Latency" text={`${item.latencyMs} ms`} />
                        )}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Checks">
                      <Action.CopyToClipboard
                        title="Copy Check Details"
                        content={`${item.title}: ${item.summary}\n\n${item.detailMarkdown}`}
                      />
                      <Action
                        title="Rerun All Checks"
                        icon={Icon.ArrowClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={revalidate}
                      />
                      <Action.CopyToClipboard
                        title="Copy Full Diagnostic Report"
                        content={fullReport}
                        shortcut={modShortcut(["shift", "alt"], "c")}
                      />
                    </ActionPanel.Section>
                    <RouterActionSection />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : null}
    </List>
  );
}
