import { Action, ActionPanel, closeMainWindow, Icon, List, popToRoot } from "@raycast/api";
import { getFavicon, showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { activateTab, ChromeTab, listTabs } from "./lib/chrome";

function hostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(listTabs, [], {
    failureToastOptions: { title: "Failed to load tabs" },
  });
  const tabs = data?.tabs ?? [];
  const skippedWindowCount = data?.skippedWindowCount ?? 0;
  const [query, setQuery] = useState("");

  // Filter by matching title and url across space-separated query words
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const visible = tabs.filter((tab) => {
    const haystack = `${tab.title}\n${tab.url}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });

  async function onSwitch(tab: ChromeTab) {
    try {
      await activateTab(tab.id);
      await closeMainWindow();
      await popToRoot({ clearSearchBar: true });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to switch tab" });
      revalidate();
    }
  }

  const retryAction = <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />;
  const skippedTitle = "Some Tabs Could Not Be Loaded";
  const skippedDetail = `${skippedWindowCount} ${skippedWindowCount === 1 ? "window" : "windows"} changed while loading`;

  return (
    <List isLoading={isLoading} filtering={false} onSearchTextChange={setQuery} searchBarPlaceholder="Search tabs...">
      {!isLoading && error && tabs.length === 0 ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Failed to Load Tabs"
          description={error.message || "Please check Raycast automation permissions for Google Chrome."}
          actions={<ActionPanel>{retryAction}</ActionPanel>}
        />
      ) : !isLoading && skippedWindowCount > 0 ? (
        <List.EmptyView
          icon={Icon.Warning}
          title={skippedTitle}
          description={skippedDetail}
          actions={<ActionPanel>{retryAction}</ActionPanel>}
        />
      ) : !isLoading ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title={tabs.length === 0 ? "No open tabs" : "No matching tabs"} />
      ) : null}
      {/* 警告を選択できる行にすると Enter がタブ切り替えではなく Retry になるので、Section の見出しに出す */}
      <List.Section
        title={skippedWindowCount > 0 ? skippedTitle : undefined}
        subtitle={skippedWindowCount > 0 ? `${skippedDetail} · ⌘↵ to retry` : undefined}
      >
        {visible.map((tab) => (
          <List.Item
            key={tab.id}
            title={tab.title || tab.url}
            subtitle={hostname(tab.url)}
            icon={getFavicon(tab.url, { fallback: Icon.Globe })}
            accessories={[{ text: `Window ${tab.windowNumber}` }]}
            actions={
              <ActionPanel>
                <Action title="Switch to Tab" icon={Icon.Switch} onAction={() => onSwitch(tab)} />
                {retryAction}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
