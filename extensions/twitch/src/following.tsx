import {
  ActionPanel,
  confirmAlert,
  Detail,
  getPreferenceValues,
  ImageMask,
  List,
  ListItem,
  OpenAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import React from "react";
import fetch from "node-fetch";
import { exec } from "child_process";

import Item from "./interfaces/FollowingItem";
import { Preferences } from "./interfaces/Preferences";
import User from "./interfaces/user";
import Action from "./utils";

export default function main() {
  const preferences: Preferences = getPreferenceValues();
  const clientId = preferences.clientId;
  const authorization = preferences.authorization;
  const streamlinkLocation = preferences.streamlink || "/opt/homebrew/bin/streamlink";
  const quality = preferences.quality || "best";

  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState<string>("");
  const [userId, setUserId] = React.useState<string>("");
  const [items, setItems] = React.useState<Item[]>([]);

  React.useEffect(() => {
    setLoading(true);
    fetch(`https://api.twitch.tv/helix/users`, {
      headers: {
        "Client-Id": clientId,
        Authorization: `Bearer ${authorization}`,
      },
    })
      .then((res) => res.json())
      .then((data: any) => {
        if (data && data.data) {
          setUserId(data.data[0].id);
        } else if (data.error && data.error.toLowerCase().includes("invalid")) {
          showToast(ToastStyle.Failure, data.message);
        }
      });
  }, []);

  React.useEffect(() => {
    if (!userId) return;

    fetch(`https://api.twitch.tv/helix/streams/followed?user_id=${userId}`, {
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
        } else if (
          (data.error && data.message.toLowerCase().includes("invalid")) ||
          data.message.toLowerCase().includes("missing")
        ) {
          showToast(ToastStyle.Failure, data.message);
        }
      });
  }, [userId]);

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
              icon={{
                source: item.thumbnail_url.replace("{width}", "320").replace("{height}", "180"),
                mask: ImageMask.RoundedRectangle,
              }}
              accessoryIcon={{
                tintColor: item.type == "live" ? "green" : "red",
                source: item.type == "live" ? "checkmark-circle-16" : "xmark-circle-16",
              }}
              accessoryTitle={`${item.type == "live" ? item.game_name : "Offline"}`}
              id={item.id}
              title={item.title}
              subtitle={item.user_name}
              actions={<Action live={item.type == "live"} name={item.user_name} />}
            />
          );
        })}
      </List>
    </>
  );
}
