import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { sendMessage, updateSessionTags } from "./api";

// ---------- Send Message Form ----------

export function SendMessageForm({
  sessionId,
  sessionTitle,
  onSent,
}: {
  sessionId: string;
  sessionTitle: string;
  onSent: () => void;
}) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { message: string }) {
    const msg = values.message.trim();
    if (!msg) {
      showToast({ style: Toast.Style.Failure, title: "Message is required" });
      return;
    }
    setIsLoading(true);
    try {
      await sendMessage(sessionId, msg);
      showToast({ style: Toast.Style.Success, title: "Message sent" });
      onSent();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to send message",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Reply to ${sessionTitle}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Message" onSubmit={handleSubmit} icon={Icon.Message} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="message" title="Message" placeholder="Type your reply..." autoFocus />
      <Form.Description text={`Replying to: ${sessionTitle}`} />
    </Form>
  );
}

// ---------- Edit Tags Form ----------

export function EditTagsForm({
  sessionId,
  sessionTitle,
  currentTags,
  onSaved,
}: {
  sessionId: string;
  sessionTitle: string;
  currentTags: string[];
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { tags: string }) {
    const tags = values.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    setIsLoading(true);
    try {
      await updateSessionTags(sessionId, tags);
      showToast({ style: Toast.Style.Success, title: "Tags updated" });
      onSaved();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update tags",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Edit Tags — ${sessionTitle}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Tags" onSubmit={handleSubmit} icon={Icon.Tag} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="tag1, tag2, tag3"
        defaultValue={currentTags.join(", ")}
        info="Comma-separated list of tags"
      />
    </Form>
  );
}
