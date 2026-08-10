import { Icon, List, getPreferenceValues, ActionPanel, open, Action, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import tmi, { ChatUserstate } from "tmi.js";

export default function Command() {
  const [chats, setChats] = useState<SingleChat[]>([]);
  const client = new tmi.Client({
    channels: [getPreferenceValues().streamName],
  });

  useEffect((): void => {
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

  const openPopupChat = async () => {
    popToRoot({ clearSearchBar: true });
    await open(`https://www.twitch.tv/popout/${getPreferenceValues().streamName}/chat`);
    client.disconnect();
  };

  return (
    <List navigationTitle={`${getPreferenceValues().streamName}'s Chat`} searchBarPlaceholder="Filter users">
      <List.Item
        icon={Icon.Message}
        title="Open Chat in Browser"
        subtitle={`twitch.tv/${getPreferenceValues().streamName}`}
        actions={
          <ActionPanel>
            <Action title="Open Chat in Browser" onAction={openPopupChat} icon={Icon.Message} />
          </ActionPanel>
        }
      />
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
