import { Icon, List, getPreferenceValues, ActionPanel } from "@raycast/api";
import { useState, useEffect } from "react";
import tmi, { ChatUserstate } from "tmi.js";

export default function Command() {
  const [chats, setChats] = useState<SingleChat[]>([]);

  useEffect((): void => {
    const client = new tmi.Client({
      channels: [getPreferenceValues().streamName],
    });

    client.connect();
    client.on("chat", (channel: string, userstate: ChatUserstate, message: string, self: boolean) => {
      if (self) {
        return;
      }
      const chat: SingleChat = {
        channel: channel,
        user: userstate.username || "",
        message: message,
        color: userstate.color || "",
        self: self,
      };
      setChats((prevChats) => [chat, ...prevChats]);
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
