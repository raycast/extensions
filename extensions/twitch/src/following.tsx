import { getPreferenceValues, Icon, Image, List, showToast, Toast } from "@raycast/api";
import React from "react";
import fetch from "node-fetch";

import Item from "./interfaces/FollowingItem";
import { Preferences } from "./interfaces/Preferences";

import { action } from "./action";
import { renderDetails } from "./helper/renderDetails";
import millify from "millify";

export default function main() {
  const preferences: Preferences = getPreferenceValues();
  const clientId = preferences.clientId;
  const authorization = preferences.authorization;

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
          showToast({ title: "Error", message: data.message, style: Toast.Style.Failure });
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
          showToast({ title: "Error", message: data.message, style: Toast.Style.Failure });
        }
      });
  }, [userId]);

  return (
    <List
      isShowingDetail
      isLoading={loading}
      searchBarPlaceholder="Search for a Streamer on Twitch"
      navigationTitle="Search a Channel"
      onSearchTextChange={(text) => setQuery(text)}
    >
      {items.map((item: Item) => {
        return (
          <List.Item
            key={item.id}
            icon={{
              source: item.thumbnail_url.replace("{width}", "320").replace("{height}", "180"),
              mask: Image.Mask.RoundedRectangle,
            }}
            accessoryTitle={`${item.type == "live" ? item.game_name : "Offline"}`}
            detail={
              <List.Item.Detail
                markdown={renderDetails(item)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title={item.title} />
                    <List.Item.Detail.Metadata.Label title="Channel Name" text={item.user_name} />
                    <List.Item.Detail.Metadata.Label title="Category" text={item.game_name} />

                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Viewers" text={millify(item.viewer_count)} />
                    <List.Item.Detail.Metadata.Label title="Started At" text={item.started_at} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Language" text={item.language} />
                    <List.Item.Detail.Metadata.Label
                      title="Content Type"
                      text={item.is_mature ? "Mature Content" : "PG"}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            id={item.id}
            title={item.user_name}
            actions={action(item.user_name)}
          />
        );
      })}
    </List>
  );
}
