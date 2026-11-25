import { useMemo, useState } from "react";
import { Action, ActionPanel, Color, Icon, List, getPreferenceValues } from "@raycast/api";
import { RouterActionSection } from "./components/CommonActions";
import { useCachedOpenWrtData } from "./lib/cache";
import { buildSafeCodeBlock, escapeMarkdownText, formatCacheBadge, inlineCode, modShortcut } from "./lib/format";
import { fetchSystemLogs } from "./lib/openwrt-extras";
import type { ExtensionPreferences, SyslogEntry, SyslogSeverity } from "./lib/types";
import { OpenWrtError, getErrorDescription } from "./lib/ubus";

type SeverityFilter = "all" | "err" | "warn" | "notice";
type LineLimitOption = "100" | "250" | "500";

const LINE_LIMIT_OPTIONS: readonly LineLimitOption[] = ["100", "250", "500"];

const ERROR_SEVERITIES = new Set<SyslogSeverity>(["emerg", "alert", "crit", "err"]);
const WARN_SEVERITIES = new Set<SyslogSeverity>(["emerg", "alert", "crit", "err", "warn"]);
const NOTICE_SEVERITIES = new Set<SyslogSeverity>(["emerg", "alert", "crit", "err", "warn", "notice"]);

function getSeverityMeta(severity: SyslogSeverity): { icon: Icon; color: Color; label: string } {
  switch (severity) {
    case "emerg":
    case "alert":
    case "crit":
    case "err":
      return { icon: Icon.XMarkCircle, color: Color.Red, label: severity.toUpperCase() };
    case "warn":
      return { icon: Icon.ExclamationMark, color: Color.Yellow, label: "WARN" };
    case "notice":
      return { icon: Icon.Info, color: Color.Blue, label: "NOTICE" };
    case "info":
    case "debug":
    case "unknown":
    default:
      return { icon: Icon.Terminal, color: Color.SecondaryText, label: severity.toUpperCase() };
  }
}

function matchesSeverityFilter(severity: SyslogSeverity, filter: SeverityFilter): boolean {
  switch (filter) {
    case "err":
      return ERROR_SEVERITIES.has(severity);
    case "warn":
      return WARN_SEVERITIES.has(severity);
    case "notice":
      return NOTICE_SEVERITIES.has(severity);
    default:
      return true;
  }
}

function getEntryKeywords(entry: SyslogEntry): string[] {
  const keywords = [entry.daemon, entry.severity, entry.facility, entry.message];
  if (entry.pid) {
    keywords.push(entry.pid);
  }
  return keywords;
}

function buildLogMarkdown(entry: SyslogEntry): string {
  const title = entry.pid
    ? `${escapeMarkdownText(entry.daemon)} (${inlineCode(entry.pid)})`
    : escapeMarkdownText(entry.daemon);

  return [`### ${title}`, "", "#### Raw Log Line", "", buildSafeCodeBlock(entry.raw || entry.message)].join("\n");
}

export default function SystemLogsCommand() {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [lineLimit, setLineLimit] = useState<LineLimitOption>("100");
  const [daemonFilter, setDaemonFilter] = useState<string | null>(null);

  const {
    data: entries,
    error,
    isLoading,
    isCached,
    isStale,
    updatedAt,
    revalidate,
  } = useCachedOpenWrtData(
    "system-logs",
    (signal) => fetchSystemLogs(Number(lineLimit), getPreferenceValues<ExtensionPreferences>(), signal),
    { variant: lineLimit },
  );

  const allEntries = useMemo(() => entries ?? [], [entries]);

  const filteredEntries = useMemo(
    () =>
      allEntries.filter((entry) => {
        if (!matchesSeverityFilter(entry.severity, severityFilter)) {
          return false;
        }
        if (daemonFilter && entry.daemon !== daemonFilter) {
          return false;
        }
        return true;
      }),
    [allEntries, severityFilter, daemonFilter],
  );

  const filteredRawLogs = useMemo(() => filteredEntries.map((entry) => entry.raw).join("\n"), [filteredEntries]);

  const cacheBadge = formatCacheBadge({ isCached, isLoading, error, updatedAt });
  const filterSummary = [
    cacheBadge,
    daemonFilter ? `Daemon: ${daemonFilter}` : "",
    allEntries.length > 0 ? `${filteredEntries.length} of ${allEntries.length} lines (last ${lineLimit})` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const navigationTitle =
    isLoading && isStale
      ? "System Logs · Updating..."
      : isStale
        ? error
          ? "System Logs · Offline (Cached)"
          : "System Logs · Cached"
        : "System Logs";

  const isConfigError =
    error instanceof OpenWrtError &&
    (error.code === "AUTH_FAILED" || error.code === "INVALID_URL" || error.code === "TLS_ERROR");
  const errorInfo = error && allEntries.length === 0 ? getErrorDescription(error) : null;
  const hasActiveFilter = severityFilter !== "all" || daemonFilter !== null;
  const showLastLinesSubmenu = (
    <ActionPanel.Submenu title="Show Last Lines" icon={Icon.List}>
      {LINE_LIMIT_OPTIONS.map((limit) => (
        <Action
          key={limit}
          title={`Show Last ${limit} Lines`}
          icon={lineLimit === limit ? Icon.CheckCircle : Icon.Circle}
          onAction={() => setLineLimit(limit)}
        />
      ))}
    </ActionPanel.Submenu>
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      isShowingDetail={filteredEntries.length > 0}
      searchBarPlaceholder="Search logs by message, daemon, PID, facility, or severity..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Severity"
          value={severityFilter}
          onChange={(value) => setSeverityFilter(value as SeverityFilter)}
        >
          <List.Dropdown.Item title="All Severities" value="all" />
          <List.Dropdown.Item title="Errors & Critical" value="err" />
          <List.Dropdown.Item title="Warnings & Above" value="warn" />
          <List.Dropdown.Item title="Notice & Above" value="notice" />
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
      ) : filteredEntries.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Terminal}
          title="No Matching Log Entries"
          description={
            hasActiveFilter
              ? "No syslog entries matched the active severity or daemon filter."
              : "No syslog entries were returned by logread."
          }
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Filter & Limit">
                {daemonFilter && (
                  <Action title="Clear Daemon Filter" icon={Icon.XMarkCircle} onAction={() => setDaemonFilter(null)} />
                )}
                {severityFilter !== "all" && (
                  <Action title="Show All Severities" icon={Icon.Filter} onAction={() => setSeverityFilter("all")} />
                )}
                {showLastLinesSubmenu}
              </ActionPanel.Section>
              <RouterActionSection onRefresh={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Syslog Entries" subtitle={filterSummary || undefined}>
          {filteredEntries.map((entry) => {
            const severityMeta = getSeverityMeta(entry.severity);
            const subtitle = entry.pid ? `${entry.daemon}[${entry.pid}]` : entry.daemon;

            return (
              <List.Item
                key={entry.id}
                id={entry.id}
                icon={{ source: severityMeta.icon, tintColor: severityMeta.color }}
                title={entry.message || entry.raw}
                subtitle={subtitle}
                keywords={getEntryKeywords(entry)}
                accessories={[
                  { tag: { value: severityMeta.label, color: severityMeta.color } },
                  { text: entry.timestamp },
                ]}
                detail={
                  <List.Item.Detail
                    markdown={buildLogMarkdown(entry)}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.TagList title="Severity">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={severityMeta.label}
                            color={severityMeta.color}
                          />
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.Label title="Daemon" text={entry.daemon} />
                        {entry.pid && <List.Item.Detail.Metadata.Label title="PID" text={entry.pid} />}
                        <List.Item.Detail.Metadata.Label title="Facility" text={entry.facility} />
                        <List.Item.Detail.Metadata.Label title="Timestamp" text={entry.timestamp} />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Copy">
                      <Action.CopyToClipboard title="Copy Log Message" content={entry.message || entry.raw} />
                      <Action.CopyToClipboard title="Copy Raw Line" content={entry.raw} />
                      {filteredRawLogs && (
                        <Action.CopyToClipboard
                          title="Copy Filtered Logs"
                          content={filteredRawLogs}
                          shortcut={modShortcut(["shift"], "c")}
                        />
                      )}
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Filter & Limit">
                      {daemonFilter ? (
                        <Action
                          title="Clear Daemon Filter"
                          icon={Icon.XMarkCircle}
                          onAction={() => setDaemonFilter(null)}
                        />
                      ) : (
                        <Action
                          title={`Filter by ${entry.daemon}`}
                          icon={Icon.Filter}
                          onAction={() => setDaemonFilter(entry.daemon)}
                        />
                      )}
                      {showLastLinesSubmenu}
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
