import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import { useCachedState } from "@raycast/utils";
import { getLogs, getAuth0ErrorMessage } from "./utils/auth0-client";
import { isTenantConfigured } from "./utils/tenant-storage";
import { useActiveTenant } from "./utils/use-active-tenant";
import { LogEntry } from "./utils/types";
import { getLogTypeInfo, formatRelativeDate, formatFilterLabel, parseTenantDomain } from "./utils/formatting";
import LogDetail from "./components/LogDetail";
import CustomTimeRangeForm from "./components/CustomTimeRangeForm";
import TenantDropdown from "./components/TenantDropdown";

/** Raycast command: browse Auth0 tenant logs with text search, date range filters, and time presets. */
export default function ViewLogs() {
  const { tenantId, tenant, tenants, switchTenant, isLoading: tenantsLoading } = useActiveTenant();
  const [searchText, setSearchText] = useState("");
  const [logs, setLogs] = useCachedState<LogEntry[]>(`logs-${tenantId}`, []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const prevTenantId = useRef(tenantId);

  const hasDateFilter = dateFrom !== null || dateTo !== null;
  const filterLabel = formatFilterLabel(dateFrom, dateTo);
  const navigationTitle = filterLabel ? `View Logs \u2014 ${filterLabel}` : "View Logs";
  const { tenantSlug, region } = parseTenantDomain(tenant?.domain ?? "");

  function applyPreset(preset: "1h" | "24h" | "7d" | "30d") {
    const now = new Date();
    const from = new Date(now);
    switch (preset) {
      case "1h":
        from.setHours(from.getHours() - 1);
        break;
      case "24h":
        from.setDate(from.getDate() - 1);
        break;
      case "7d":
        from.setDate(from.getDate() - 7);
        break;
      case "30d":
        from.setDate(from.getDate() - 30);
        break;
    }
    setDateFrom(from);
    setDateTo(null);
  }

  const fetchLogs = useCallback(
    async (search: string, fromDate: Date | null, toDate: Date | null) => {
      if (!tenant) return;

      if (!isTenantConfigured(tenant)) {
        setError(`Please configure ${tenant.name} credentials`);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const results = await getLogs(tenant, {
          search: search || undefined,
          dateFrom: fromDate ?? undefined,
          dateTo: toDate ?? undefined,
        });
        setLogs(results);
      } catch (err) {
        const message = getAuth0ErrorMessage(err, "read:logs");
        setError(message);
        showToast({ style: Toast.Style.Failure, title: "Fetch Failed", message });
      } finally {
        setIsLoading(false);
      }
    },
    [tenant],
  );

  useEffect(() => {
    if (prevTenantId.current !== tenantId) {
      setLogs([]);
      prevTenantId.current = tenantId;
    }

    if (!tenant) return;

    const timer = setTimeout(() => {
      fetchLogs(searchText, dateFrom, dateTo);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText, fetchLogs, tenantId, tenant, dateFrom, dateTo]);

  if (error && !logs.length) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Configuration Required" description={error} />
      </List>
    );
  }

  if (!tenantsLoading && tenants.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Building}
          title="No Tenants Configured"
          description="Use the Switch Tenant command to add a tenant first"
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading || tenantsLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search logs by user, client, or description..."
      navigationTitle={navigationTitle}
      searchBarAccessory={<TenantDropdown tenantId={tenantId} tenants={tenants} onTenantChange={switchTenant} />}
    >
      {logs.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.List}
          title="No Logs"
          description={searchText ? "No logs match your search" : "No recent logs found"}
        />
      )}
      {logs.map((log, index) => {
        const typeInfo = getLogTypeInfo(log.type);
        return (
          <List.Item
            key={log.log_id || `log-${index}`}
            icon={{ source: typeInfo.icon, tintColor: typeInfo.color }}
            title={log.user_name || log.description || typeInfo.label}
            subtitle={log.client_name || ""}
            accessories={[
              tenant ? { tag: { value: tenant.environment, color: tenant.color } } : {},
              log.ip ? { text: log.ip } : {},
              { text: formatRelativeDate(log.date), tooltip: log.date },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="View Details" icon={Icon.Eye} target={<LogDetail log={log} tenant={tenant!} />} />
                {log.log_id && (
                  <Action.CopyToClipboard
                    title="Copy Log ID"
                    content={log.log_id}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                )}
                {tenant?.domain && (
                  <Action.OpenInBrowser
                    title="Open in Auth0 Dashboard"
                    url={`https://manage.auth0.com/dashboard/${region}/${tenantSlug}/logs/${log.log_id}/`}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                )}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => fetchLogs(searchText, dateFrom, dateTo)}
                />
                <Action.PickDate
                  title="Filter Exact Date"
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  type={Action.PickDate.Type.Date}
                  onChange={(date) => {
                    if (date) {
                      const start = new Date(date);
                      start.setHours(0, 0, 0, 0);
                      const end = new Date(date);
                      end.setHours(23, 59, 59, 999);
                      setDateFrom(start);
                      setDateTo(end);
                    }
                  }}
                />
                <Action.PickDate
                  title="Filter from Date"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  type={Action.PickDate.Type.DateTime}
                  onChange={(date) => setDateFrom(date)}
                />
                <Action.PickDate
                  title="Filter to Date"
                  shortcut={{ modifiers: ["opt", "shift"], key: "d" }}
                  type={Action.PickDate.Type.DateTime}
                  onChange={(date) => setDateTo(date)}
                />
                <ActionPanel.Submenu title="Time Presets" icon={Icon.Clock} shortcut={{ modifiers: ["cmd"], key: "t" }}>
                  <Action title="Last Hour" onAction={() => applyPreset("1h")} />
                  <Action title="Last 24 Hours" onAction={() => applyPreset("24h")} />
                  <Action title="Last 7 Days" onAction={() => applyPreset("7d")} />
                  <Action title="Last 30 Days" onAction={() => applyPreset("30d")} />
                  <Action.Push
                    title="Custom Range\u2026"
                    icon={Icon.Pencil}
                    target={
                      <CustomTimeRangeForm
                        onApply={(from) => {
                          setDateFrom(from);
                          setDateTo(null);
                        }}
                      />
                    }
                  />
                </ActionPanel.Submenu>
                {hasDateFilter && (
                  <Action
                    title="Clear Date Filter"
                    icon={Icon.XMarkCircle}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                    onAction={() => {
                      setDateFrom(null);
                      setDateTo(null);
                    }}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
