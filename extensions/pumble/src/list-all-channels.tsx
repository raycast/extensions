import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Channel, fetchChannels, sendMessage } from "./api";

function SendMessageForm({ channel }: { channel: Channel }) {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  async function handleSubmit(values: { message: string; asBot: boolean }) {
    if (!values.message) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Message is required",
        message: "Please enter a message to send.",
      });
      return;
    }

    setIsLoading(true);
    try {
      await sendMessage(values.message, channel.channel.name, values.asBot);
      await showToast({
        style: Toast.Style.Success,
        title: "Message sent",
        message: `Message sent to ${channel.channel.name}${values.asBot ? " as bot" : " as yourself"}.`,
      });
      pop();
    } catch (error) {
      console.error("Error sending message:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to send message",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Message" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description
        title={`Send to #${channel.channel.name}`}
        text={channel.channel.description || "Send a message to this channel"}
      />
      <Form.TextArea id="message" title="Message" placeholder="Enter your message" enableMarkdown autoFocus />
      <Form.Checkbox id="asBot" label="Send as Bot" defaultValue={false} />
    </Form>
  );
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

        // Debug log to check what's coming from the API
        console.log("Fetched channels:", data);

        if (!data || !Array.isArray(data)) {
          console.error("Invalid channel data:", data);
          setError("Received invalid channel data from the API");
          setIsLoading(false);
          return;
        }

        // Filter for public channels only - channelType must be "PUBLIC"
        const publicChannels = data.filter(
          (channelItem) => channelItem.channel.channelType === "PUBLIC" && channelItem.channel.isMember === true,
        );

        console.log(`Filtered from ${data.length} to ${publicChannels.length} public accessible channels`);

        setChannels(publicChannels);
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
          title="No public channels found"
          description="You don't have access to any public channels in your Pumble workspace."
        />
      ) : (
        channels.map((channelItem) => {
          const { channel } = channelItem;
          return (
            <List.Item
              key={channel.id}
              icon={Icon.Globe}
              title={channel.name}
              subtitle={channel.description || ""}
              accessories={[{ text: "Public" }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Send Message"
                    icon={Icon.Message}
                    target={<SendMessageForm channel={channelItem} />}
                  />
                  <Action.Push
                    title="Show Channel Details"
                    target={
                      <Detail
                        markdown={`# ${channel.name}\n\n${channel.description ? `**Description:** ${channel.description}\n\n` : ""}**Type:** Public`}
                        metadata={
                          <Detail.Metadata>
                            <Detail.Metadata.Label title="ID" text={channel.id} />
                            <Detail.Metadata.Label title="Type" text="Public" />
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
