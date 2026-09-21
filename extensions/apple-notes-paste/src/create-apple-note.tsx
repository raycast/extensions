import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  getPreferenceValues,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";

import { createAppleNote } from "./notes";

type Preferences = { defaultFolder?: string };

export default function CreateAppleNote() {
  const { defaultFolder } = getPreferenceValues<Preferences>();
  const [isCreating, setIsCreating] = useState(false);

  async function handleSubmit(values: { title: string; content: string }) {
    try {
      setIsCreating(true);
      await createAppleNote(values.title, values.content, defaultFolder?.trim());
      await closeMainWindow();
      await showHUD("Apple Note created");
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not create note", message: String(error) });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Form
      isLoading={isCreating}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Apple Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Note title" autoFocus />
      <Form.TextArea id="content" title="Content" placeholder="Text to save in the note" />
      <Form.Description
        text={
          defaultFolder?.trim()
            ? `The note will be saved in ${defaultFolder.trim()}.`
            : "The note will be saved in Apple Notes' default folder."
        }
      />
    </Form>
  );
}
