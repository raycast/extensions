import { Action, ActionPanel, Form, Toast, popToRoot, showToast } from "@raycast/api";
import { useState } from "react";
import { Visibility, createMemo } from "./api";

interface FormValues {
  content: string;
  visibility: Visibility;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: FormValues) {
    if (!values.content.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Memo content is empty" });
      return;
    }
    setIsLoading(true);
    try {
      await createMemo(values.content, values.visibility);
      await showToast({ style: Toast.Style.Success, title: "Memo created" });
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create memo",
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
          <Action.SubmitForm title="Create Memo" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="Content" placeholder="What's on your mind?" autoFocus />
      <Form.Dropdown id="visibility" title="Visibility" defaultValue="PRIVATE">
        <Form.Dropdown.Item value="PRIVATE" title="Private" />
        <Form.Dropdown.Item value="PROTECTED" title="Protected" />
        <Form.Dropdown.Item value="PUBLIC" title="Public" />
      </Form.Dropdown>
    </Form>
  );
}
