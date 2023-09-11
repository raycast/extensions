import { Action, ActionPanel, getPreferenceValues, Grid, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import React, { useEffect, useState } from "react";

import Game from "./interfaces/game";
import { Preferences } from "./interfaces/Preferences";

export default function main() {
  const preferences: Preferences = getPreferenceValues();
  const clientId = preferences.clientId;
  const authorization = preferences.authorization;

  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState<string>("");
  const [items, setItems] = useState<Game[]>([]);

  useEffect(() => {
    if (query.length == 0) return;
    setLoading(true);

    fetch(`https://api.twitch.tv/helix/search/categories?query=${query}&live_only=true`, {
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
        } else if (data.error && data.message.toLowerCase().includes("invalid")) {
          showToast({
            style: Toast.Style.Failure,
            title: data.message,
          });
        }
      });
  }, [query]);

  return (
    <Grid
      isLoading={loading}
      searchBarPlaceholder="Search for game..."
      onSearchTextChange={(text) => setQuery(text)}
      itemSize={Grid.ItemSize.Medium}
    >
      {items.map((item: Game) => {
        return (
          <Grid.Item
            content={item.box_art_url.replace("52x72", "285x380")}
            key={item.id}
            id={item.id}
            title={item.name}
            actions={
              <ActionPanel>
                <Action.Open
                  title="Open Category"
                  target={`https://twitch.tv/directory/game/${encodeURIComponent(item.name)}`}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
