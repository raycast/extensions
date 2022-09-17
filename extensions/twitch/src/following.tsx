import { Color, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { useEffect, useState } from "react";

import Item from "./interfaces/FollowingItem";
import { Preferences } from "./interfaces/Preferences";

import millify from "millify";
import { action } from "./helpers/action";
import { formatDate, getUpTime } from "./helpers/datetime";
import { renderDetails } from "./helpers/renderDetails";

export default function main() {
  const preferences: Preferences = getPreferenceValues();
  const clientId = preferences.clientId;
  const authorization = preferences.authorization;

  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
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

  useEffect(() => {
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
            accessoryTitle={`${item.type == "live" ? item.game_name : "Offline"}`}
            detail={
              <List.Item.Detail
                markdown={renderDetails(item)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title={item.title} />
                    <List.Item.Detail.Metadata.Label title="Channel Name" text={item.user_name} />
                    <List.Item.Detail.Metadata.Label
                      title="Category"
                      text={item.game_name}
                      icon={{ source: Icon.Box, tintColor: Color.Purple }}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Viewer Count"
                      text={millify(item.viewer_count)}
                      icon={{ source: Icon.Person, tintColor: Color.Red }}
                    />

                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Started At"
                      text={formatDate(item.started_at)}
                      icon={{ source: Icon.Clock, tintColor: Color.Blue }}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Stream Uptime"
                      text={getUpTime(item.started_at)}
                      icon={{ source: Icon.Clock, tintColor: Color.Blue }}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Language"
                      text={item.language}
                      icon={{ source: Icon.SpeechBubble, tintColor: Color.Yellow }}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Content Type"
                      text={item.is_mature ? "Mature Content" : "PG"}
                      icon={{ source: Icon.Eye, tintColor: item.is_mature ? Color.Red : Color.Green }}
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
