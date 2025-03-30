import { Action, ActionPanel, Detail, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Channel, fetchChannels } from "./api";

interface Preferences {
  apiKey?: string;
}

export default function Command() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function loadChannels() {
      if (!preferences.apiKey) {
        setError("API Key not found. Please set it in the extension preferences.");
        setIsLoading(false);
        return;
      }

      try {
        const data = await fetchChannels();
        console.log("Fetched channels:", data);
        setChannels(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching channels:", error);
        setError(`Failed to fetch channels: ${error instanceof Error ? error.message : String(error)}`);
        setIsLoading(false);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch channels",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    loadChannels();
  }, [preferences.apiKey]);

  return (
    <List isLoading={isLoading}>
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Error fetching channels"
          description={error}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Learn More" url="https://pumble.com/" />
            </ActionPanel>
          }
        />
      ) : channels.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Bubble}
          title="No channels found"
          description="There are no channels in your Pumble workspace or the API returned an empty list."
        />
      ) : (
        channels.map((channelItem) => {
          const { channel } = channelItem;
          return (
            <List.Item
              key={channel.id}
              icon={channel.channelType === "PUBLIC" ? Icon.Globe : Icon.Lock}
              title={channel.name}
              subtitle={channel.description || ""}
              accessories={[{ text: channel.channelType === "PUBLIC" ? "Public" : "Private" }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Channel Details"
                    target={
                      <Detail
                        markdown={`# ${channel.name}\n\n${channel.description ? `**Description:** ${channel.description}\n\n` : ""}**Type:** ${channel.channelType === "PUBLIC" ? "Public" : "Private"}`}
                        metadata={
                          <Detail.Metadata>
                            <Detail.Metadata.Label title="ID" text={channel.id} />
                            <Detail.Metadata.Label title="Type" text={channel.channelType === "PUBLIC" ? "Public" : "Private"} />
                            {channel.description && (
                              <Detail.Metadata.Label title="Description" text={channel.description} />
                            )}
                            <Detail.Metadata.Label title="Main Channel" text={channel.isMain ? "Yes" : "No"} />
                            <Detail.Metadata.Label title="Members" text={channelItem.users?.length.toString() || "0"} />
                          </Detail.Metadata>
                        }
                      />
                    }
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
