import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  popToRoot,
} from "@raycast/api";
import { useState } from "react";

interface Preferences {
  apiKey: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    if (!message.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Message required",
        message: "Please enter a message to send",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { apiKey } = getPreferenceValues<Preferences>();

      const response = await fetch(
        "https://poke.com/api/v1/inbound-sms/webhook",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: message.trim() }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Message sent",
        message: "Your message was sent to Poke",
      });

      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to send",
        message: error instanceof Error ? error.message : "Unknown error",
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
          <Action.SubmitForm title="Send to Poke" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="Message"
        placeholder="Enter your message..."
        value={message}
        onChange={setMessage}
        autoFocus
      />
    </Form>
  );
}
