import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { getDevinClient } from "../lib/devin";
import { getExtensionPreferences } from "../lib/preferences";

type FormValues = {
  message: string;
};

type Props = {
  sessionId: string;
  onSent?: () => Promise<void> | void;
};

export function SendMessageForm({ sessionId, onSent }: Props) {
  const client = getDevinClient();
  const preferences = getExtensionPreferences();
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: FormValues) {
    setIsSubmitting(true);

    try {
      const detail = await client.sendMessage(sessionId, values.message.trim());
      await onSent?.();
      await showToast({
        style: Toast.Style.Success,
        title: "Message sent",
        message: detail,
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to send message",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={preferences.demoMode ? `Message ${sessionId} (Demo)` : `Message ${sessionId}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Message" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="message" title="Message" placeholder="Send additional instructions to this Devin session" />
    </Form>
  );
}
