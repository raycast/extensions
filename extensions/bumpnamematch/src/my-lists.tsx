import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { ListDetail } from "./list-detail";
import { getPrefs } from "./lib/prefs";
import { type FavoriteList, type FavoriteListsResponse } from "./lib/api";

export default function Command() {
  const { baseUrl, apiKey } = getPrefs();
  const [lists, setLists] = useState<FavoriteList[]>([]);
  const [isLoading, setIsLoading] = useState(!!apiKey);

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/favorite-lists`, { headers: { "x-api-key": apiKey } });
        if (res.ok && !cancelled) {
          const d = (await res.json()) as FavoriteListsResponse;
          setLists((d.lists ?? []).filter((l) => l.isArchived === 0));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiKey, baseUrl]);

  if (!apiKey) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Key}
          title="Add your API key"
          description={`Set your Bump Name Match API key in this extension's preferences to view and manage your lists. Create one at ${baseUrl}/dashboard/api-keys`}
          actions={
            <ActionPanel>
              <Action title="Set API Key in Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.OpenInBrowser title="Create an API Key" url={`${baseUrl}/dashboard/api-keys`} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter lists…">
      {lists.map((list) => {
        const accessories: List.Item.Accessory[] = [];
        if (list.isPublic === 1) accessories.push({ text: "Public" });
        return (
          <List.Item
            key={list.id}
            title={list.name}
            icon={list.isDefault === 1 ? Icon.Star : Icon.List}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Open List"
                  icon={Icon.ChevronRight}
                  target={<ListDetail list={list} allLists={lists} baseUrl={baseUrl} apiKey={apiKey} />}
                />
                <Action.OpenInBrowser title="Open in Browser" url={`${baseUrl}/dashboard/favorite-lists/${list.id}`} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
