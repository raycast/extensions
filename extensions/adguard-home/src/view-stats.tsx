import React from "react";
import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { getStats, Stats, getAdGuardHomeUrl } from "./api";
import { useAutoRefresh } from "./hooks/useAutoRefresh";

export default function Command() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isAutoRefreshEnabled, toggleAutoRefresh } = useAutoRefresh(fetchStats, 5000);

  async function fetchStats() {
    try {
      const data = await getStats();
      setStats(data);
    } catch (error) {
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <List isLoading={isLoading}>
      <List.Item
        title="DNS Queries Today"
        icon={{ source: Icon.Globe, tintColor: Color.Blue }}
        accessories={[
          {
            text: stats?.dns_queries?.toLocaleString() ?? "0",
            icon: { source: Icon.Dot, tintColor: Color.Blue },
          },
        ]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.OpenInBrowser title="Open in Adguard Home" url={`${getAdGuardHomeUrl()}/#`} />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Refresh Stats"
                icon={Icon.ArrowClockwise}
                onAction={fetchStats}
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
      <List.Item
        title="Blocked Queries Today"
        icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
        accessories={[
          {
            text: stats?.blocked_filtering?.toLocaleString() ?? "0",
            icon: { source: Icon.Dot, tintColor: Color.Red },
          },
        ]}
      />
      <List.Item
        title="Safe Browsing Blocks"
        icon={{ source: Icon.Shield, tintColor: Color.Orange }}
        accessories={[
          {
            text: stats?.replaced_safebrowsing?.toLocaleString() ?? "0",
            icon: { source: Icon.Dot, tintColor: Color.Orange },
          },
        ]}
      />
      <List.Item
        title="Parental Control Blocks"
        icon={{ source: Icon.Person, tintColor: Color.Purple }}
        accessories={[
          {
            text: stats?.replaced_parental?.toLocaleString() ?? "0",
            icon: { source: Icon.Dot, tintColor: Color.Purple },
          },
        ]}
      />
    </List>
  );
}
