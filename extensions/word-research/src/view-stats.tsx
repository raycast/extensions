import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { fetchStats, formatShortDate, TopWord } from "./api";

const RANK_COLORS: Record<number, Color> = {
  0: Color.Yellow,
  1: Color.Orange,
  2: Color.Red,
};

export default function Command() {
  const { data: stats, isLoading, error } = usePromise(fetchStats, []);

  return (
    <List isLoading={isLoading}>
      {!isLoading && !stats && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to Load Stats"
          description={error?.message ?? "Could not connect to wordresearch.xyz. Please try again."}
        />
      )}
      {stats && (
        <>
          <List.Section title="Overview">
            <List.Item
              icon={{ source: Icon.BarChart, tintColor: Color.Blue }}
              title="Total Discoveries"
              accessories={[{ text: stats.total_count.toLocaleString() }]}
            />
            <List.Item
              icon={{ source: Icon.Text, tintColor: Color.Green }}
              title="Total Words Indexed"
              accessories={[{ text: stats.total_words.toLocaleString() }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open Stats Page" url="https://wordresearch.xyz/stats" />
                </ActionPanel>
              }
            />
          </List.Section>

          <List.Section title="Top Words">
            {stats.top_words.map((item: TopWord, index: number) => (
              <List.Item
                key={item.word}
                icon={{ source: Icon.CircleFilled, tintColor: RANK_COLORS[index] ?? Color.SecondaryText }}
                title={item.word}
                subtitle={`${item.search_count.toLocaleString()} searches`}
                accessories={[{ text: formatShortDate(item.discovered_at) }]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Word" content={item.word} />
                    <Action.OpenInBrowser title="Open Stats Page" url="https://wordresearch.xyz/stats" />
                    <Action.OpenInBrowser
                      title="Open in Wiktionary"
                      url={`https://en.wiktionary.org/wiki/${encodeURIComponent(item.word)}`}
                    />
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
