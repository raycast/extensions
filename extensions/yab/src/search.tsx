import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { HistoryListItem } from "./history-item";
import { TabItem } from "./tab-item";
import { getHistory, getTabs, openTab, searchUrl, toUrl } from "./yab";

export default function Command() {
  const [text, setText] = useState("");
  const tabs = useCachedPromise(getTabs);
  const history = useCachedPromise(async () => getHistory().slice(0, 500));
  const q = text.trim();
  const url = toUrl(q);
  const target = url ?? searchUrl(q);

  return (
    <List
      filtering
      isLoading={tabs.isLoading || history.isLoading}
      onSearchTextChange={setText}
      searchBarPlaceholder="Search tabs and history, or type a URL"
    >
      {q && (
        <List.Section title="Open">
          <List.Item
            title={q}
            subtitle={url ? "Open URL" : "Search the web"}
            icon={url ? Icon.Globe : Icon.MagnifyingGlass}
            actions={
              <ActionPanel>
                <Action title="Open in New Tab" icon={Icon.Plus} onAction={() => openTab(target)} />
                <Action.CopyToClipboard title="Copy URL" content={target} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section title="Open Tabs">
        {(tabs.data ?? []).map((t) => (
          <TabItem key={t.id} tab={t} onChange={tabs.revalidate} />
        ))}
      </List.Section>
      <List.Section title="History">
        {(history.data ?? []).map((h) => (
          <HistoryListItem key={h.url} item={h} />
        ))}
      </List.Section>
    </List>
  );
}
