import { Action, ActionPanel, Form, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { sendMessage } from "./api";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const preferences = getPreferenceValues<Preferences>();

  async function handleSubmit(values: { channel: string; message: string; asBot: boolean }) {
    if (!preferences.apiKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Key not found",
        message: "Please set your API Key in the extension preferences.",
      });
      return;
    }

    if (!values.channel) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Channel is required",
        message: "Please enter a channel name or ID.",
      });
      return;
    }

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
      await sendMessage(values.message, values.channel, values.asBot);
      await showToast({
        style: Toast.Style.Success,
        title: "Message sent",
        message: `Message sent to ${values.channel}${values.asBot ? " as bot" : " as yourself"}.`,
      });
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
        </ActionPanel>
      }
    >
      <Form.TextField id="channel" title="Channel" placeholder="Enter channel name or ID" />
      <Form.TextArea id="message" title="Message" placeholder="Enter your message" />
      <Form.Checkbox id="asBot" label="Send as Bot" defaultValue={false} />
    </Form>
  );
}
