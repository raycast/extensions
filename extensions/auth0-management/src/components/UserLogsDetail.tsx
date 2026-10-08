import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { getLogs, getAuth0ErrorMessage } from "../utils/auth0-client";
import { LogEntry, Tenant, User } from "../utils/types";
import { getLogTypeInfo, formatRelativeDate, formatFilterLabel } from "../utils/formatting";
import LogDetail from "./LogDetail";
import CustomTimeRangeForm from "./CustomTimeRangeForm";

interface UserLogsDetailProps {
  user: User;
  tenant: Tenant;
}

/** List view showing Auth0 logs filtered to a specific user, with date range filtering. */
export default function UserLogsDetail({ user, tenant }: UserLogsDetailProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);

  const hasDateFilter = dateFrom !== null || dateTo !== null;
  const filterLabel = formatFilterLabel(dateFrom, dateTo);
  const baseTitle = `Logs: ${user.email}`;
  const navigationTitle = filterLabel ? `${baseTitle} \u2014 ${filterLabel}` : baseTitle;

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
    async (fromDate: Date | null, toDate: Date | null) => {
      setIsLoading(true);
      try {
        const results = await getLogs(tenant, {
          search: `user_id:"${user.user_id}"`,
          dateFrom: fromDate ?? undefined,
          dateTo: toDate ?? undefined,
        });
        setLogs(results);
      } catch (err) {
        const message = getAuth0ErrorMessage(err, "read:logs");
        showToast({ style: Toast.Style.Failure, title: "Fetch Failed", message });
      } finally {
        setIsLoading(false);
      }
    },
    [tenant, user.user_id],
  );

  useEffect(() => {
    fetchLogs(dateFrom, dateTo);
  }, [fetchLogs, dateFrom, dateTo]);

  return (
    <List isLoading={isLoading} navigationTitle={navigationTitle}>
      {logs.length === 0 && !isLoading && (
        <List.EmptyView icon={Icon.List} title="No Logs" description="No recent logs found for this user" />
      )}
      {logs.map((log, index) => {
        const typeInfo = getLogTypeInfo(log.type);
        return (
          <List.Item
            key={log.log_id || `log-${index}`}
            icon={{ source: typeInfo.icon, tintColor: typeInfo.color }}
            title={log.description || typeInfo.label}
            subtitle={log.client_name || ""}
            accessories={[log.ip ? { text: log.ip } : {}, { text: formatRelativeDate(log.date), tooltip: log.date }]}
            actions={
              <ActionPanel>
                <Action.Push title="View Details" icon={Icon.Eye} target={<LogDetail log={log} tenant={tenant} />} />
                {log.log_id && (
                  <Action.CopyToClipboard
                    title="Copy Log ID"
                    content={log.log_id}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                )}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => fetchLogs(dateFrom, dateTo)}
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
