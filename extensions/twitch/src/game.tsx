import {
  ActionPanel,
  confirmAlert,
  Detail,
  getPreferenceValues,
  List,
  ListItem,
  OpenAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import React from "react";
import fetch from "node-fetch";

import { Preferences } from "./interfaces/Preferences";
import Game from "./interfaces/game";

export default function main() {
  const preferences: Preferences = getPreferenceValues();
  const clientId = preferences.clientId;
  const authorization = preferences.authorization;

  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState<string>("");
  const [items, setItems] = React.useState<Game[]>([]);

  React.useEffect(() => {
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
          showToast(ToastStyle.Failure, data.message);
        }
      });
  }, [query]);

  return (
    <>
      <List
        isLoading={loading}
        searchBarPlaceholder="Search for a Categorie on Twitch"
        navigationTitle="Search a Categorie"
        onSearchTextChange={(text) => setQuery(text)}
      >
        {items.map((item: Game) => {
          return (
            <ListItem
              icon={item.box_art_url}
              key={item.id}
              id={item.id}
              title={item.name}
              actions={
                <ActionPanel>
                  <OpenAction
                    title="Open Categorie"
                    target={`https://twitch.tv/directory/game/${encodeURIComponent(item.name)}`}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List>
    </>
  );
}
