import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";

import { createMessage } from "../api/chat";
import type { Message, Space } from "../api/types";
import { showChatError } from "../helpers/feedback";
import { messageSnippet } from "../helpers/message-view";
import type { UserNames } from "../helpers/chat-format";

interface ReplyFormProps {
  space: Space;
  spaceTitle: string;
  message: Message;
  names?: UserNames;
  onSent?: () => void;
}

/** Replies in the message's thread, or starts a new thread if replying isn't possible. */
export function ReplyForm({ space, spaceTitle, message, names, onSent }: ReplyFormProps) {
  const { pop } = useNavigation();
  const [textError, setTextError] = useState<string | undefined>();

  async function submit(values: { text: string }) {
    if (!values.text.trim()) {
      setTextError("Write a reply");
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Sending reply" });
    try {
      await createMessage(space.name, values.text, message.thread?.name);
      toast.style = Toast.Style.Success;
      toast.title = `Replied in ${spaceTitle}`;
      onSent?.();
      pop();
    } catch (error) {
      await toast.hide();
      await showChatError(error);
    }
  }

  return (
    <Form
      navigationTitle={`Reply in ${spaceTitle}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Reply" icon={Icon.Reply} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Replying to" text={messageSnippet(message, names)} />
      <Form.TextArea
        id="text"
        title="Reply"
        placeholder="*bold* _italic_ ~strike~ `code`"
        error={textError}
        onChange={() => textError && setTextError(undefined)}
        autoFocus
      />
    </Form>
  );
}
