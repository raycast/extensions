import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { createSnippet } from "../lib/hooks/useSnippets";

interface CreateSnippetFormProps {
  noteId: string;
  onSuccess: () => void;
}

export function CreateSnippetForm({
  noteId,
  onSuccess,
}: CreateSnippetFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: { title: string; content: string }) => {
    if (!values.content.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Content is required",
      });
      return;
    }

    setIsLoading(true);

    try {
      await createSnippet(noteId, values.content.trim(), values.title.trim());

      await showToast({
        style: Toast.Style.Success,
        title: "Snippet created",
      });

      onSuccess();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create snippet",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="New Snippet"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Snippet" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Optional snippet title"
      />
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Enter your prompt content..."
        enableMarkdown
      />
    </Form>
  );
}
