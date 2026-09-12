import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { saveWithFeedback } from "./lib/save-with-feedback";

interface FormValues {
  title: string;
  content: string;
}

export default function Command() {
  const [titleError, setTitleError] = useState<string | undefined>();
  const [contentError, setContentError] = useState<string | undefined>();

  async function handleSubmit(values: FormValues) {
    if (!values.title.trim()) {
      setTitleError("Title is required");
      return;
    }
    if (!values.content) {
      setContentError("Content is required");
      return;
    }

    await saveWithFeedback(values.title, values.content);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to Cl1p.net" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          "https://cl1p.net/{note name}\nLink is destroyed after it's opened once"
        }
      />
      <Form.TextField
        id="title"
        title="Note Name"
        placeholder="my-note"
        error={titleError}
        onChange={() => setTitleError(undefined)}
      />
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Paste anything you want to save"
        error={contentError}
        onChange={() => setContentError(undefined)}
      />
    </Form>
  );
}
