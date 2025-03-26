import { Action, ActionPanel, Form, Icon, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import * as emoji from "node-emoji";
import { format, formatDistanceToNow } from "date-fns";

import { withSlackClient } from "./shared/withSlackClient";
import { SlackClient, ThreadMessage } from "./shared/client/SlackClient";
import { useChannels, useMe } from "./shared/client";
import { handleError } from "./shared/utils";

function GetThreadMessages() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [channelId, setChannelId] = useState("");
  const [threadTs, setThreadTs] = useState("");
  
  const { data: me } = useMe();
  const { data: channels } = useChannels();
  const users = channels?.[0];

  const handleSubmit = async (values: { channelId: string; threadTs: string }) => {
    if (!values.channelId || !values.threadTs) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing required fields",
        message: "Please provide both Channel ID and Thread Timestamp",
      });
      return;
    }

    setChannelId(values.channelId);
    setThreadTs(values.threadTs);
    setIsLoading(true);
    
    try {
      const result = await SlackClient.getThreadMessages(values.channelId, values.threadTs);
      setMessages(result);
      
      if (result.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No messages found",
          message: "Could not find any messages in the thread",
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: `Found ${result.length} messages`,
        });
        setIsFormSubmitted(true);
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isFormSubmitted) {
    return (
      <Form
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Get Thread Messages" onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="channelId"
          title="Channel ID"
          placeholder="Enter Channel ID (e.g., C12345678)"
          info="The ID of the channel containing the thread"
          required
        />
        <Form.TextField
          id="threadTs"
          title="Thread Timestamp"
          placeholder="Enter Thread Timestamp (e.g., 1234567890.123456)"
          info="The timestamp of the parent message in the thread"
          required
        />
      </Form>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search messages...">
      <List.Section title={`Thread Messages (${messages.length})`}>
        {messages.map((message) => {
          const user = users?.find((u) => u.id === message.senderId);
          const formattedText = emoji.emojify(message.message);
          const date = message.receivedAt;
          const formattedDate = format(date, "EEEE dd MMMM yyyy 'at' HH:mm");
          
          return (
            <List.Item
              key={message.ts}
              icon={{ value: user?.icon, tooltip: user?.name ?? "Unknown user" }}
              title={formattedText}
              accessories={[{ date, tooltip: formattedDate }]}
              detail={
                <List.Item.Detail
                  markdown={formattedText}
                  metadata={
                    <List.Item.Detail.Metadata>
                      {user ? <List.Item.Detail.Metadata.Label title="From" icon={user.icon} text={user.name} /> : null}
                      <List.Item.Detail.Metadata.Label
                        title="Posted"
                        icon={Icon.Clock}
                        text={formatDistanceToNow(date)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Timestamp"
                        icon={Icon.Tag}
                        text={message.ts}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Message Text"
                    content={message.message}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Message Timestamp"
                    content={message.ts}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action
                    title="Back to Form"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                    onAction={() => setIsFormSubmitted(false)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

export default withSlackClient(GetThreadMessages);