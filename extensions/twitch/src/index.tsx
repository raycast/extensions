import {
  ActionPanel,
  confirmAlert,
  Detail,
  getPreferenceValues,
  ImageMask,
  List,
  ListItem,
  OpenAction,
  showHUD,
  showToast,
  ToastStyle,
} from "@raycast/api";
import React from "react";
import fetch from "node-fetch";

import Item from "./interfaces/Item";
import { Preferences } from "./interfaces/Preferences";
import Action from "./utils";

export default function main() {
  const preferences: Preferences = getPreferenceValues();
  const clientId = preferences.clientId;
  const authorization = preferences.authorization;

  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState<string>("");
  const [items, setItems] = React.useState<Item[]>([]);

  React.useEffect(() => {
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
          showToast(ToastStyle.Failure, data.message);
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
            <ListItem
              key={item.id}
              icon={{ source: item.thumbnail_url, mask: ImageMask.Circle }}
              accessoryIcon={{
                tintColor: item.is_live ? "green" : "red",
                source: item.is_live ? "checkmark-circle-16" : "xmark-circle-16",
              }}
              accessoryTitle={`${item.is_live ? item.game_name : "Offline"}`}
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
