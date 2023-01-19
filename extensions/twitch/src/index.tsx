import { getPreferenceValues, Image, List, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { useEffect, useState } from "react";
import { action } from "./helpers/action";
import Item from "./interfaces/FollowingItem";
import { Preferences } from "./interfaces/Preferences";

export default function main() {
  const preferences: Preferences = getPreferenceValues();
  const clientId = preferences.clientId;
  const authorization = preferences.authorization;

  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (query.length == 0) return;
    setLoading(true);

    fetch(`https://api.twitch.tv/helix/search/channels?query=${query}&live_only=true`, {
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
          showToast(Toast.Style.Failure, data.message);
        }
      });
  }, [query]);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search for a streamer..."
      onSearchTextChange={(text) => setQuery(text)}
    >
      {items.map((item: Item) => {
        return (
          <List.Item
            key={item.id}
            icon={{ source: item.thumbnail_url, mask: Image.Mask.Circle }}
            id={item.id}
            title={item.title}
            subtitle={item.user_name}
            actions={action(item.broadcaster_login, item.is_live || false)}
          />
        );
      })}
    </List>
  );
}
