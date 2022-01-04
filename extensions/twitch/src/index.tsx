import { ActionPanel, confirmAlert, Detail, getPreferenceValues, ImageMask, List, ListItem, OpenAction, showHUD, showToast, ToastStyle } from "@raycast/api";
import React from "react";
import fetch from 'node-fetch';
import { exec } from "child_process";

import Item from "./interfaces/Item";
import Preferences from "./interfaces/preferences";

export default function main() {
  const preferences: Preferences = getPreferenceValues();
  const clientId = preferences.clientId;
  const authorization = preferences.authorization;
  const streamlinkLocation = preferences.streamlink || "/opt/homebrew/bin/streamlink";
  const playerLocation = preferences.player || "";
  const quality = preferences.quality || "best";

  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState<string>("");
  const [items, setItems] = React.useState<Item[]>([]);

  React.useEffect(() => {
    if (query.length == 0) return;
    setLoading(true);

    fetch(`https://api.twitch.tv/helix/search/channels?query=${query}&live_only=true`, {
      headers: {
        'Client-Id': clientId,
        'Authorization': `Bearer ${authorization}`,
      }
    }).then(res => res.json()).then((data: any) => {
      if (data && data.data) {
        setItems(data.data);
        setLoading(false);
      } else if (data.error && data.error.toLowerCase().includes("invalid")) {
        showToast(ToastStyle.Failure, data.message);
      }
    });
  }, [query]);

  return (<>
    <List isLoading={loading} searchBarPlaceholder="Search for a Streamer on Twitch" navigationTitle="Search a Channel" onSearchTextChange={(text) => setQuery(text)}>
      {items.map((item: Item) => {
        return <ListItem key={item.id} icon={{ source: item.thumbnail_url, mask: ImageMask.Circle }} accessoryIcon={{ tintColor: item.is_live ? "green" : "red", source: item.is_live ? "checkmark-circle-16" : "xmark-circle-16" }} accessoryTitle={`${item.is_live ? item.game_name : "Offline"}`} id={item.id} title={item.title} subtitle={item.display_name} actions={
          <ActionPanel>
            <OpenAction title="Open Channel" target={`https://twitch.tv/${item.broadcaster_login}`} />
            <OpenAction title="Open Stream in Streamlink" target="streamlink" onOpen={(target) => {
              if (!item.is_live) { showToast(ToastStyle.Failure, "This streamer is offline!"); return; }

              exec(`${streamlinkLocation} https://twitch.tv/${item.broadcaster_login} ${quality} ${playerLocation ? `--player ${playerLocation}` : ""}`, (err, stdout, stderr) => {
                if (err) {
                  showToast(ToastStyle.Failure, "Error at starting Streamlink");
                }
              });
            }} shortcut={{ modifiers: ["opt"], key: "enter" }} />
          </ActionPanel>
        } />
      })}
    </List>
  </>)
}
