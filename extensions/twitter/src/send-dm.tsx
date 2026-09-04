import { Action, ActionPanel, confirmAlert, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { getErrorMessage } from "./utils";
import { clientV2 } from "./v2/lib/twitterapi_v2";

interface DirectMessageFormValues {
  recipients: string;
  text: string;
  media: string[];
}

async function resolveRecipientIds(value: string): Promise<{ ids: string[]; labels: string[] }> {
  const recipients = [
    ...new Set(
      value
        .split(/[\s,]+/)
        .map((recipient) => recipient.trim())
        .filter(Boolean),
    ),
  ];
  if (recipients.length === 0) throw new Error("Enter at least one recipient username or user ID.");

  const resolved = await Promise.all(
    recipients.map(async (recipient) => {
      if (/^\d{1,19}$/.test(recipient)) return { id: recipient, label: recipient };
      const username = recipient.replace(/^@/, "");
      const user = await clientV2.getUserByUsername(username);
      return { id: user.id, label: `@${user.username}` };
    }),
  );
  return { ids: resolved.map(({ id }) => id), labels: resolved.map(({ label }) => label) };
}

export default function SendDirectMessageCommand() {
  const [isSending, setIsSending] = useState(false);

  const submit = async (values: DirectMessageFormValues) => {
    try {
      setIsSending(true);
      if (values.media.length > 1) throw new Error("A direct message can contain only one media attachment.");
      const recipients = await resolveRecipientIds(values.recipients);
      const text = values.text.trim();
      if (!text && values.media.length === 0) throw new Error("Enter a message or attach media.");

      const approved = await confirmAlert({
        title: recipients.ids.length === 1 ? "Send Direct Message?" : "Create Group Conversation?",
        message: `This privately sends ${text ? `“${text}”` : "one media attachment"} to ${recipients.labels.join(", ")}.`,
        icon: Icon.Message,
        primaryAction: { title: "Send" },
      });
      if (!approved) return;

      const toast = await showToast({ style: Toast.Style.Animated, title: "Sending direct message..." });
      await clientV2.sendDirectMessage(recipients.ids, text, values.media[0]);
      toast.style = Toast.Style.Success;
      toast.title = "Direct message sent";
      popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not send direct message",
        message: getErrorMessage(error),
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Form
      isLoading={isSending}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Review and Send" icon={Icon.Message} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="recipients"
        title="Recipients"
        placeholder="@username or numeric ID, separated by commas"
        info="One recipient sends a 1:1 DM; multiple recipients create a group."
      />
      <Form.TextArea id="text" title="Message" placeholder="Write a direct message" />
      <Form.FilePicker
        id="media"
        title="Media"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        info="Optional: one image, GIF, or video."
      />
      <Form.Description text="Only send DMs the recipient expects. X may reject messages based on the recipient's privacy settings." />
    </Form>
  );
}
