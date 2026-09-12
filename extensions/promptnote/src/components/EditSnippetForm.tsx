import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { updateSnippet } from "../lib/hooks/useSnippets";
import { Snippet } from "../lib/types";

interface EditSnippetFormProps {
  snippet: Snippet;
  onSuccess: () => void;
}

export function EditSnippetForm({ snippet, onSuccess }: EditSnippetFormProps) {
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
      await updateSnippet(snippet.id, {
        title: values.title.trim(),
        content: values.content.trim(),
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Snippet updated",
      });

      onSuccess();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update snippet",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Edit Version ${snippet.version}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Optional snippet title"
        defaultValue={snippet.title}
      />
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Enter your prompt content..."
        defaultValue={snippet.content}
        enableMarkdown
      />
    </Form>
  );
}
