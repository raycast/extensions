import { getPreferenceValues, Image, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import Item from "./interfaces/FollowingItem";
import { Preferences } from "./interfaces/Preferences";
import Action from "./utils";

export default function main() {
  const preferences: Preferences = getPreferenceValues();
  const clientId = preferences.clientId;
  const authorization = preferences.authorization;

  const [loading, setLoading] = useState(true);
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
          showToast(Toast.Style.Failure, data.message);
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
          showToast(Toast.Style.Failure, data.message);
        }
      });
  }, [userId]);

  return (
    <>
      <List isLoading={loading} searchBarPlaceholder="Search for a streamer...">
        {items.map((item: Item) => {
          return (
            <List.Item
              key={item.id}
              icon={{
                source: item.thumbnail_url.replace("{width}", "320").replace("{height}", "180"),
                mask: Image.Mask.RoundedRectangle,
              }}
              accessories={[
                {
                  text: item.type == "live" ? item.game_name : "Offline",
                },
                {
                  icon: {
                    source: item.type == "live" ? "checkmark-circle-16" : "xmark-circle-16",
                    tintColor: item.type == "live" ? "green" : "red",
                  },
                },
              ]}
              id={item.id}
              title={item.title}
              subtitle={item.user_name}
              actions={<Action live={item.type == "live"} name={item.user_login} />}
            />
          );
        })}
      </List>
    </>
  );
}
