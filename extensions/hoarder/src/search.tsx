import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import type { SearchResult } from "./types";

export default function Search() {
  const preferences: Preferences = getPreferenceValues();
  const [searchText, setSearchText] = useState("");
  const { isLoading, data } = useFetch(
    () =>
      `${preferences.apiUrl}/api/trpc/bookmarks.searchBookmarks?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": { json: { text: searchText } } }))}`,
    {
      mapResult(result: SearchResult) {
        return {
          data: result[0].result.data.json.bookmarks,
        };
      },
      headers: {
        Authorization: `Bearer ${preferences.apiKey}`,
      },
      keepPreviousData: true,
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText}>
      {data
        .filter((bookmark) => bookmark.content.type === "link")
        .map((bookmark) => (
          <List.Item
            key={bookmark.id}
            title={bookmark.content.title}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={bookmark.content.url} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
