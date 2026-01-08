import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, popToRoot, Icon } from "@raycast/api";
import { sendSavedMessage } from "./services/telegram-client";
import { getConfig, ensureAuthenticated } from "./utils/auth";

export default function SendSavedMessage() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Empty Message",
        message: "Please enter a message to send",
      });
      return;
    }

    setIsLoading(true);
    try {
      const authenticated = await ensureAuthenticated();
      if (!authenticated) {
        setIsLoading(false);
        return;
      }

      const config = getConfig();
      await sendSavedMessage(config, message);

      await showToast({
        style: Toast.Style.Success,
        title: "Message sent to Saved Messages",
      });
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Send Message",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.ArrowRight} title="Send Message" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="Message"
        info="This message will be sent to your Saved Messages in Telegram"
        placeholder="Enter your message..."
        value={message}
        onChange={setMessage}
        enableMarkdown
      />
    </Form>
  );
}
