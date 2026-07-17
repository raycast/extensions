import { Action, ActionPanel, Form, open, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { buildAppUrl } from "./config";
import { remoApi } from "./utils/api";
import { handleError } from "./utils/errors";

interface CreateNoteForm {
  title: string;
  content: string;
}

export default function CreateNote() {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: CreateNoteForm) {
    setIsLoading(true);
    try {
      const noteId = await remoApi.createNote({
        title: values.title,
        content: values.content,
        source: "raycast",
        isQuickCaptured: false,
      });

      const webUrl = buildAppUrl(`/notes/${noteId}`);

      showToast({
        style: Toast.Style.Success,
        title: "Note created",
      });

      await open(webUrl);
      pop();
    } catch (error) {
      handleError(error, "Failed to create note");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="My Note" />
      <Form.TextArea id="content" title="Content" placeholder="Note content..." enableMarkdown={true} />
    </Form>
  );
}
