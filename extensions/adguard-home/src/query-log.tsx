import React from "react";
import { List, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getQueryLog, QueryLogEntry, getAdGuardHomeUrl } from "./api";
import { useAutoRefresh } from "./hooks/useAutoRefresh";

export default function Command() {
  const [entries, setEntries] = useState<QueryLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAutoRefreshEnabled, toggleAutoRefresh } = useAutoRefresh(fetchData, 5000);

  async function fetchData() {
    try {
      const data = await getQueryLog(20);
      setEntries(data);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch query log",
        message: String(error),
      });
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <List isLoading={isLoading}>
      {entries.map((entry, index) => (
        <List.Item
          key={index}
          title={entry.question.name}
          subtitle={entry.client}
          icon={{
            source: entry.blocked ? Icon.XMarkCircle : Icon.CheckCircle,
            tintColor: entry.blocked ? Color.Red : Color.Green,
          }}
          accessories={[
            { text: new Date(entry.time).toLocaleTimeString() },
            {
              text: entry.blocked ? "Blocked" : "Allowed",
              icon: {
                source: entry.blocked ? Icon.XMarkCircle : Icon.CheckCircle,
                tintColor: entry.blocked ? Color.Red : Color.Green,
              },
            },
            {
              text: entry.question.type,
              tooltip: entry.reason || "No reason provided",
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser title="Open in Adguard Home" url={`${getAdGuardHomeUrl()}/#logs`} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Refresh Query Log"
                  icon={Icon.ArrowClockwise}
                  onAction={fetchData}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action
                  title={isAutoRefreshEnabled ? "Disable Auto-refresh" : "Enable Auto-refresh"}
                  icon={isAutoRefreshEnabled ? Icon.Stop : Icon.Play}
                  onAction={toggleAutoRefresh}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
