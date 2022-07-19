import { Icon, List, getPreferenceValues, ActionPanel } from "@raycast/api";
import { useState, useEffect } from "react";
import tmi from "tmi.js";

export default function Command() {
  const [chats, setChats] = useState<SingleChat[]>([]);

  useEffect((): void => {
    const client = new tmi.Client({
      channels: [getPreferenceValues().streamName],
    });

    client.connect();
    client.on("message", (channel: string, tags: Tags, message: string, self: boolean) => {
      const newChat: SingleChat = {
        channel,
        user: tags["display-name"],
        message: message,
        color: tags["color"],
        self,
      };
      setChats((chats) => [newChat, ...chats].slice(0, 10));
    });
  }, []);

  return (
    <List navigationTitle={`${getPreferenceValues().streamName}'s Chat`} searchBarPlaceholder="Filter users">
      {chats.map((chat: SingleChat) => {
        return (
          <List.Item
            icon={{ source: Icon.Circle, tintColor: chat.color }}
            title={chat.user}
            subtitle={chat.message}
            key={`${chat.user}@${chat.message}`}
          />
        );
      })}
    </List>
  );
}

interface SingleChat {
  channel: string;
  user: string;
  message: string;
  color: string;
  self: boolean;
}

interface Tags {
  "display-name": string;
  color: string;
}
