import React from "react";
import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { getDetailedStats, getAdGuardHomeUrl } from "./api";
import { useAutoRefresh } from "./hooks/useAutoRefresh";

export default function Command() {
  const [items, setItems] = useState<Array<Record<string, number>>>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { isAutoRefreshEnabled, toggleAutoRefresh } = useAutoRefresh(fetchData, 5000);

  async function fetchData() {
    try {
      const data = await getDetailedStats();
      const topItems = data.top_queried_domains?.slice(0, 10) || [];
      setItems(topItems);

      // Calculate total count
      const total = topItems.reduce((sum, item) => {
        const [, count] = Object.entries(item)[0];
        return sum + count;
      }, 0);
      setTotalCount(total);
    } catch (error) {
      setItems([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function getNameAndCount(item: Record<string, number>): { name: string; count: number; percentage: string } {
    const [name, count] = Object.entries(item)[0];
    const percentage = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : "0";
    return { name, count, percentage };
  }

  return (
    <List isLoading={isLoading}>
      {items.map((item, index) => {
        const { name, count, percentage } = getNameAndCount(item);
        return (
          <List.Item
            key={index}
            title={name}
            accessories={[{ text: `${count.toLocaleString()} (${percentage}%)` }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser title="Open in Adguard Home" url={`${getAdGuardHomeUrl()}/#`} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Refresh"
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
        );
      })}
    </List>
  );
}
