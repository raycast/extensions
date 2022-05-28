import { getPreferenceValues, Image, List, showToast, Toast } from "@raycast/api";
import React from "react";
import fetch from "node-fetch";

import { Preferences } from "./interfaces/Preferences";
import Item from "./interfaces/item";
import { action } from "./action";

export default function main() {
  const preferences: Preferences = getPreferenceValues();
  const clientId = preferences.clientId;
  const authorization = preferences.authorization;
  const streamlinkLocation = preferences.streamlink || "/opt/homebrew/bin/streamlink";
  const quality = preferences.quality || "best";

  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState<string>("");
  const [items, setItems] = React.useState<Item[]>([]);

  React.useEffect(() => {
    if (query.length == 0) return;
    setLoading(true);

    fetch(`https://api.twitch.tv/helix/search/channels?query=${query}&live_only=false`, {
      headers: {
        "Client-Id": clientId,
        Authorization: `Bearer ${authorization}`,
      },
    })
      .then((res) => res.json())
      .then((data: any) => {
        if (data && data.data) {
          setItems(data.data);
          setLoading(false);
        } else if (data.error && data.error.toLowerCase().includes("invalid")) {
          showToast({ title: "Error", message: data.message, style: Toast.Style.Failure });
        }
      });
  }, [query]);

  return (
    <>
      <List
        isLoading={loading}
        searchBarPlaceholder="Search for a Streamer on Twitch"
        navigationTitle="Search a Channel"
        onSearchTextChange={(text) => setQuery(text)}
      >
        {items.map((item: Item) => {
          return (
            <List.Item
              key={item.id}
              icon={{ source: item.thumbnail_url, mask: Image.Mask.Circle }}
              accessoryIcon={{
                tintColor: item.is_live ? "green" : "red",
                source: item.is_live ? "checkmark-circle-16" : "xmark-circle-16",
              }}
              accessoryTitle={`${item.is_live ? item.game_name : "Offline"}`}
              id={item.id}
              title={item.title}
              subtitle={item.display_name}
              actions={action(item.display_name, item.is_live)}
            />
          );
        })}
      </List>
    </>
  );
}
