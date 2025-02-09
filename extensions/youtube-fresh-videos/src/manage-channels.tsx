import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { getStoredChannels, removeChannel } from "./utils/storage";

interface Channel {
  id: string;
  title: string;
}

export default function ManageChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadChannels() {
    const storedChannels = await getStoredChannels();
    setChannels(storedChannels);
    setIsLoading(false);
  }

  async function handleRemoveChannel(channelId: string, title: string) {
    try {
      await removeChannel(channelId);
      showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: `Channel ${title} has been removed`,
      });
      loadChannels();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Unable to remove channel",
      });
    }
  }

  useEffect(() => {
    loadChannels();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search channels...">
      {channels.map((channel) => (
        <List.Item
          key={channel.id}
          title={channel.title}
          subtitle={channel.id}
          actions={
            <ActionPanel>
              <Action
                title="Remove Channel"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleRemoveChannel(channel.id, channel.title)}
              />
              <Action.OpenInBrowser title="View on Youtube" url={`https://www.youtube.com/channel/${channel.id}`} />
              <Action.CopyToClipboard title="Copy Channel Id" content={channel.id} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
