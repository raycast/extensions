import { getPreferenceValues, ImageMask, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { Preferences } from "./interfaces/Preferences";
import Item from "./interfaces/item";
import Action from "./utils";

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
          showToast(Toast.Style.Failure, data.message);
        }
      });
  }, [query]);

  return (
    <>
      <List
        isLoading={loading}
        searchBarPlaceholder="Search for a streamer..."
        onSearchTextChange={(text) => setQuery(text)}
      >
        {items.map((item: Item) => {
          return (
            <List.Item
              key={item.id}
              icon={{ source: item.thumbnail_url, mask: ImageMask.Circle }}
              accessories={[
                {
                  text: item.is_live ? item.game_name : "Offline",
                },
                {
                  icon: {
                    source: item.is_live ? "checkmark-circle-16" : "xmark-circle-16",
                    tintColor: item.is_live ? "green" : "red",
                  },
                },
              ]}
              id={item.id}
              title={item.title}
              subtitle={item.display_name}
              actions={<Action live={item.is_live} name={item.broadcaster_login} />}
            />
          );
        })}
      </List>
    </>
  );
}
