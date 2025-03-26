import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import * as emoji from "node-emoji";
import { format } from "date-fns";

import { withSlackClient } from "./shared/withSlackClient";
import { SlackClient, ThreadMessage } from "./shared/client/SlackClient";
import { useChannels, useMe } from "./shared/client";
import { handleError } from "./shared/utils";

function GetMessage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<ThreadMessage | null>(null);
  const { data: me } = useMe();
  const { data: channels } = useChannels();
  const users = channels?.[0];

  const handleSubmit = async (values: { channelId: string; messageTs: string }) => {
    if (!values.channelId || !values.messageTs) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing required fields",
        message: "Please provide both Channel ID and Message Timestamp",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await SlackClient.getMessage(values.channelId, values.messageTs);
      setMessage(result);
      
      if (!result) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Message not found",
          message: "Could not find the message with the provided details",
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "Message found",
        });
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMessageDetails = () => {
    if (!message) return null;
    
    const user = users?.find((u) => u.id === message.senderId);
    const formattedText = emoji.emojify(message.message);
    const formattedDate = format(message.receivedAt, "EEEE dd MMMM yyyy 'at' HH:mm");
    
    return (
      <Form.Description
        title="Message Details"
        text={`**From:** ${user?.name || "Unknown user"}\n**Time:** ${formattedDate}\n\n${formattedText}`}
      />
    );
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get Message" onSubmit={handleSubmit} />
          {message && message.replyCount && message.replyCount > 0 ? (
            <Action
              title="View Thread Messages"
              icon={Icon.BulletPoints}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={() => {
                // We'll implement this in the next component
              }}
            />
          ) : null}
          {message && message.ts ? (
            <Action.CopyToClipboard
              title="Copy Message Timestamp"
              content={message.ts}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="channelId"
        title="Channel ID"
        placeholder="Enter Channel ID (e.g., C12345678)"
        info="The ID of the channel containing the message"
        required
      />
      <Form.TextField
        id="messageTs"
        title="Message Timestamp"
        placeholder="Enter Message Timestamp (e.g., 1234567890.123456)"
        info="The timestamp of the message to retrieve"
        required
      />
      
      {message && getMessageDetails()}
    </Form>
  );
}

export default withSlackClient(GetMessage);