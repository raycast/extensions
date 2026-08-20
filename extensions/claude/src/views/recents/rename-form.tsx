import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import type { Conversation } from "../../type";

/**
 * Rename uses `title`, falling back to the first question when absent — per the brief.
 * A minimal Form rather than any inline-edit affordance: Raycast's `List.Item` has no
 * text-input action, so a pushed Form is the standard shape (matches `QuestionForm` /
 * `ModelForm` elsewhere in this codebase).
 */
export const RenameForm = ({
  conversation,
  onSubmit,
}: {
  conversation: Conversation;
  onSubmit: (title: string) => void;
}) => {
  const { pop } = useNavigation();
  const initialTitle = conversation.title ?? conversation.chats[0]?.question ?? "";
  const [title, setTitle] = useState<string>(initialTitle);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Save"
            icon={Icon.Checkmark}
            onAction={() => {
              onSubmit(title.trim());
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Name this conversation" value={title} onChange={setTitle} />
    </Form>
  );
};
