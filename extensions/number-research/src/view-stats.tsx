import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";

import { StatsData, fetchStats, formatShortDate } from "./api";

const RANK_COLORS: Record<number, Color> = {
  0: Color.Yellow,
  1: Color.Orange,
  2: Color.Red,
};

export default function Command() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats()
      .then((data) => {
        setStats(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load stats");
        setIsLoading(false);
      });
  }, []);

  return (
    <List isLoading={isLoading}>
      {!isLoading && !stats && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to Load Stats"
          description={error ?? "Could not connect to numberresearch.xyz. Please try again."}
        />
      )}
      {stats && (
        <>
          <List.Section title="Overview">
            <List.Item
              icon={{ source: Icon.Star, tintColor: Color.Yellow }}
              title="Number of the Day"
              accessories={[{ tag: { value: stats.number_of_the_day, color: Color.Yellow } }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Number" content={stats.number_of_the_day} />
                  <Action.OpenInBrowser url="https://numberresearch.xyz" />
                </ActionPanel>
              }
            />
            <List.Item
              icon={{ source: Icon.BarChart, tintColor: Color.Blue }}
              title="Total Numbers Discovered"
              accessories={[{ text: stats.total_count.toLocaleString() }]}
            />
          </List.Section>

          <List.Section title="Top Numbers">
            {stats.top_numbers.map((item, index) => (
              <List.Item
                key={item.number}
                icon={{ source: Icon.CircleFilled, tintColor: RANK_COLORS[index] ?? Color.SecondaryText }}
                title={item.number}
                subtitle={`${item.search_count.toLocaleString()} searches`}
                accessories={[{ text: formatShortDate(item.discovered_at) }]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Number" content={item.number} />
                    <Action.OpenInBrowser url="https://numberresearch.xyz" />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
