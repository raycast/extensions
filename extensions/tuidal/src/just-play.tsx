import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { api } from "./api";

export default function JustPlay() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  async function play() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      await api.justPlay(query);
      await showToast({
        style: Toast.Style.Success,
        title: `▶ Playing: "${query}"`,
      });
    } catch (e: unknown) {
      const is404 = e instanceof Error && e.message.includes("404");
      await showToast({
        style: Toast.Style.Failure,
        title: is404 ? "No results found" : "Tuidal not running",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Song, artist, album… press Enter to play instantly"
      onSearchTextChange={setQuery}
    >
      {query.trim() ? (
        <List.Item
          icon={Icon.Play}
          title={`Play "${query}"`}
          subtitle="Top result will start immediately"
          actions={
            <ActionPanel>
              <Action title="Just Play" icon={Icon.Play} onAction={play} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Music}
          title="Just Play"
          description="Type anything — Tuidal will find and play the best match."
        />
      )}
    </List>
  );
}
