import {
  List,
  ActionPanel,
  Action,
  Icon,
  LocalStorage,
  Color,
  Clipboard,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import LogDetailView from "./log-detail";
import { useDynatraceQuery } from "../../lib/query";
import { parseTimeframe } from "../../lib/utils/parseTimeframe";
import { buildDqlQuery, LogLevel } from "../../lib/utils/buildDqlQuery";
import { LogRecord } from "../../lib/types/log";
import { getActiveTenant } from "../../lib/tenants";
import EmptyTenantState from "../../components/EmptyTenantState";
import { getActiveTenantOrMock } from "../../lib/mockTenant";
import { useEffect, useState, useMemo, useCallback } from "react";
import type { TenantConfig } from "../../lib/auth";
import { toJson, toCsv } from "../../lib/utils/exportData";

// ── Persistence keys ───────────────────────────────────────────────────────
const KEY_TIMEFRAME = "dt_last_timeframe";
const KEY_LOG_LEVEL = "dt_last_log_level";
const KEY_TIMEFRAME_PRESET = "dt_timeframe_preset";

// Timeframe presets
const TIMEFRAME_PRESETS = [
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
] as const;

// Log level dropdown options
const LOG_LEVEL_OPTIONS: { title: string; value: LogLevel }[] = [
  { title: "All Levels", value: "all" },
  { title: "Error", value: "error" },
  { title: "Fatal", value: "fatal" },
  { title: "Warning", value: "warning" },
  { title: "Info", value: "info" },
  { title: "Debug", value: "debug" },
];

interface CommandArguments {
  timeframeValue: string;
  timeframeUnit: "h" | "m" | "d";
  query: LogLevel;
}

interface CommandProps {
  arguments: CommandArguments;
  _extraFilter?: string;
}

// ── Colors & Icons ─────────────────────────────────────────────────────────

const LOG_LEVEL_COLORS: Record<string, Color> = {
  ERROR: Color.Red,
  FATAL: Color.Red,
  WARN: Color.Yellow,
  WARNING: Color.Yellow,
  INFO: Color.Blue,
  DEBUG: Color.SecondaryText,
};

function getLogColor(loglevel: string): Color {
  return LOG_LEVEL_COLORS[loglevel?.toUpperCase()] ?? Color.SecondaryText;
}

function formatRelativeTime(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

export default function Command(props: CommandProps) {
  const { timeframeValue, timeframeUnit } = props.arguments;
  const extraFilter = props._extraFilter;
  const { push } = useNavigation();

  // Persist filter state
  const [storedTimeframe, setStoredTimeframe] = useState<string | null>(null);
  const [timeframePreset, setTimeframePreset] = useState<string | null>(null);
  const [selectedLogLevel, setSelectedLogLevel] = useState<LogLevel>(props.arguments.query ?? "error");
  const [selectedService, setSelectedService] = useState<string>("all");
  const [contentSearch, setContentSearch] = useState<string>("");
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [tenantChecked, setTenantChecked] = useState(false);

  // Pagination state
  const [allRecords, setAllRecords] = useState<LogRecord[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Debounce timer for content search
  const [debouncedContent, setDebouncedContent] = useState<string>("");

  // Effective values: prefer timeframe preset, then CLI args, then stored, then default
  const timeframe =
    timeframePreset || (timeframeValue ? `${timeframeValue}${timeframeUnit ?? "h"}` : null) || storedTimeframe || "24h";

  const { data, isLoading, error, execute } = useDynatraceQuery<LogRecord>();

  // Load persisted filters and active tenant once on mount
  useEffect(() => {
    Promise.all([
      LocalStorage.getItem<string>(KEY_TIMEFRAME),
      LocalStorage.getItem<string>(KEY_LOG_LEVEL),
      LocalStorage.getItem<string>(KEY_TIMEFRAME_PRESET),
      getActiveTenantOrMock(() => getActiveTenant()),
    ]).then(([tf, savedLevel, preset, activeTenant]) => {
      if (!timeframeValue && tf) setStoredTimeframe(tf);
      if (preset) setTimeframePreset(preset);
      // Restore log level: CLI arg takes priority, then saved, then default "error"
      if (!props.arguments.query && savedLevel) {
        setSelectedLogLevel(savedLevel as LogLevel);
      }
      setTenant(activeTenant);
      setTenantChecked(true);
      setFiltersLoaded(true);
    });
  }, []);

  // Debounce content search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedContent(contentSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [contentSearch]);

  // Execute query after filters are loaded; re-run when any filter changes
  useEffect(() => {
    if (!filtersLoaded || !tenant) return;

    const timeRange = parseTimeframe(timeframe);
    const dql = buildDqlQuery({
      logLevel: selectedLogLevel,
      serviceName: selectedService !== "all" ? selectedService : undefined,
      contentFilter: debouncedContent || undefined,
      extraFilter: extraFilter ? `filter ${extraFilter}` : undefined,
    });

    execute(dql, timeRange, tenant);

    // Persist effective timeframe and log level
    LocalStorage.setItem(KEY_TIMEFRAME, timeframe);
    LocalStorage.setItem(KEY_LOG_LEVEL, selectedLogLevel);

    // Reset pagination when query changes
    setAllRecords([]);
  }, [timeframe, selectedLogLevel, selectedService, debouncedContent, filtersLoaded, tenant, extraFilter]);

  // Update data when new results come in (append for "load more", replace on new query)
  useEffect(() => {
    if (data?.records) {
      // If oldest record from last batch exists in new data, we're loading more
      const isLoadMore =
        allRecords.length > 0 && data.records.some((r) => r.timestamp === allRecords[allRecords.length - 1]?.timestamp);

      if (isLoadMore) {
        setAllRecords((prev) => [
          ...prev,
          ...data.records.filter((r) => !prev.some((p) => p.timestamp === r.timestamp)),
        ]);
        setIsLoadingMore(false);
      } else {
        setAllRecords(data.records);
      }
    }
  }, [data]);

  const handleServiceChange = (value: string) => {
    setSelectedService(value);
    setAllRecords([]); // Reset pagination on filter change
  };

  const handleLogLevelChange = (value: string) => {
    setSelectedLogLevel(value as LogLevel);
    setAllRecords([]);
  };

  const handleTimeframePresetChange = async (preset: string) => {
    setTimeframePreset(preset);
    await LocalStorage.setItem(KEY_TIMEFRAME_PRESET, preset);
  };

  const handleLoadMore = useCallback(async () => {
    if (allRecords.length === 0 || !tenant) return;
    setIsLoadingMore(true);

    const oldestRecord = allRecords[allRecords.length - 1];
    const timeRange = parseTimeframe(timeframe);

    // Build query with "before" cursor for pagination
    const dql = buildDqlQuery({
      logLevel: selectedLogLevel,
      serviceName: selectedService !== "all" ? selectedService : undefined,
      contentFilter: debouncedContent || undefined,
      before: oldestRecord.timestamp,
      extraFilter: extraFilter ? `filter ${extraFilter}` : undefined,
    });

    execute(dql, timeRange, tenant);
  }, [allRecords, tenant, timeframe, selectedLogLevel, selectedService, debouncedContent, execute, extraFilter]);

  const handleExportJson = async () => {
    try {
      const json = toJson(allRecords);
      await Clipboard.copy(json);
      await showToast({
        style: Toast.Style.Success,
        title: "Exported",
        message: `${allRecords.length} logs exported to clipboard as JSON`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Export failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleExportCsv = async () => {
    try {
      const csv = toCsv(
        allRecords.map((r) => ({
          timestamp: r.timestamp,
          service: r["service.name"] ?? r["dt.app.name"] ?? "",
          level: r.loglevel,
          content: r.content,
        })),
      );
      await Clipboard.copy(csv);
      await showToast({
        style: Toast.Style.Success,
        title: "Exported",
        message: `${allRecords.length} logs exported to clipboard as CSV`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Export failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Collect unique service names from current results
  const serviceOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const log of allRecords) {
      const s = (log["service.name"] ?? log["dt.app.name"]) as string | undefined;
      if (s) seen.add(s);
    }
    return Array.from(seen).sort();
  }, [allRecords]);

  // Show empty tenant state only in real mode without tenant
  if (tenantChecked && !tenant) {
    return (
      <List isLoading={false}>
        <EmptyTenantState />
      </List>
    );
  }

  // Timeframe dropdown — for quick selection of time range
  const timeframeDropdown = (
    <List.Dropdown tooltip="Timeframe" value={timeframePreset || ""} onChange={handleTimeframePresetChange}>
      {TIMEFRAME_PRESETS.map((preset) => (
        <List.Dropdown.Item key={preset.value} title={`Last ${preset.label}`} value={preset.value} />
      ))}
    </List.Dropdown>
  );

  // Log level dropdown — always visible as primary filter
  const logLevelDropdown = (
    <List.Dropdown tooltip="Log Level" value={selectedLogLevel} onChange={handleLogLevelChange}>
      {LOG_LEVEL_OPTIONS.map((opt) => (
        <List.Dropdown.Item key={opt.value} title={opt.title} value={opt.value} />
      ))}
    </List.Dropdown>
  );

  // Shared action panel content
  const filterAndExportActions = (
    <>
      {/* Service filter — shown when multiple services detected */}
      {serviceOptions.length >= 2 && (
        <ActionPanel.Section title="Filter by Service">
          <Action
            title="All Services"
            icon={selectedService === "all" ? Icon.CheckCircle : Icon.Circle}
            onAction={() => handleServiceChange("all")}
          />
          {serviceOptions.map((s) => (
            <Action
              key={s}
              title={s}
              icon={selectedService === s ? Icon.CheckCircle : Icon.Circle}
              onAction={() => handleServiceChange(s)}
            />
          ))}
        </ActionPanel.Section>
      )}

      <ActionPanel.Section title="Timeframe">
        {TIMEFRAME_PRESETS.map((preset) => (
          <Action
            key={preset.value}
            title={`Last ${preset.label}`}
            icon={timeframePreset === preset.value ? Icon.CheckCircle : Icon.Clock}
            onAction={() => handleTimeframePresetChange(preset.value)}
          />
        ))}
      </ActionPanel.Section>

      {allRecords.length > 0 && (
        <ActionPanel.Section title="Export">
          <Action title="Copy All as JSON" icon={Icon.Clipboard} onAction={handleExportJson} />
          <Action title="Copy All as CSV" icon={Icon.Clipboard} onAction={handleExportCsv} />
        </ActionPanel.Section>
      )}
    </>
  );

  if (!isLoading && !error && allRecords.length === 0 && !isLoadingMore) {
    return (
      <List
        isLoading={false}
        searchBarPlaceholder="Search in log content..."
        searchBarAccessory={
          <>
            {timeframeDropdown}
            {logLevelDropdown}
          </>
        }
        onSearchTextChange={setContentSearch}
      >
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No logs found"
          description="Try changing the log level, timeframe, or search query."
          actions={<ActionPanel>{filterAndExportActions}</ActionPanel>}
        />
      </List>
    );
  }

  if (error && !isLoading && allRecords.length === 0) {
    return (
      <List
        isLoading={false}
        searchBarAccessory={
          <>
            {timeframeDropdown}
            {logLevelDropdown}
          </>
        }
      >
        <List.EmptyView
          icon={Icon.Warning}
          title="Query Failed"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  if (!tenant) return;
                  const timeRange = parseTimeframe(timeframe);
                  const dql = buildDqlQuery({
                    logLevel: selectedLogLevel,
                    serviceName: selectedService !== "all" ? selectedService : undefined,
                    contentFilter: debouncedContent || undefined,
                  });
                  execute(dql, timeRange, tenant);
                }}
              />
              {filterAndExportActions}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading && allRecords.length === 0}
      searchBarPlaceholder="Search in log content..."
      searchBarAccessory={
        <>
          {timeframeDropdown}
          {logLevelDropdown}
        </>
      }
      onSearchTextChange={setContentSearch}
    >
      {allRecords.map((log, index) => {
        const level = log.loglevel?.toUpperCase() ?? "";
        const tagColor = getLogColor(log.loglevel);
        return (
          <List.Item
            key={`${log.timestamp}-${index}`}
            icon={Icon.Document}
            title={(log["service.name"] ?? log["dt.app.name"] ?? "Unknown Service") as string}
            subtitle={log.content}
            accessories={[
              { tag: { value: level, color: tagColor }, tooltip: `Log Level: ${level}` },
              { text: formatRelativeTime(log.timestamp), tooltip: log.timestamp },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Open Details"
                  icon={Icon.ArrowRight}
                  onAction={() => push(<LogDetailView log={log} tenant={tenant ?? undefined} />)}
                />
                <Action.CopyToClipboard content={log.content} title="Copy Log Content" />
                <Action.CopyToClipboard content={log.timestamp} title="Copy Timestamp" />
                {filterAndExportActions}
              </ActionPanel>
            }
          />
        );
      })}

      {/* Load more button */}
      {allRecords.length > 0 && !error && (
        <List.Item
          title={isLoadingMore ? "Loading more logs..." : "Load 50 more logs"}
          icon={isLoadingMore ? Icon.Clock : Icon.Plus}
          actions={
            <ActionPanel>
              <Action title={isLoadingMore ? "Loading…" : "Load More"} icon={Icon.Plus} onAction={handleLoadMore} />
              {filterAndExportActions}
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
