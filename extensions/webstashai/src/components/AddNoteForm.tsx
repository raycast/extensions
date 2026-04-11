import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { addNote, handleApiError } from "../api/client";

export default function AddNoteForm({
  pageId,
  onAdded,
}: {
  pageId: string;
  onAdded?: () => void;
}) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { content: string }) {
    const content = values.content.trim();
    if (!content) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Note cannot be empty",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addNote(pageId, content);
      await showToast({ style: Toast.Style.Success, title: "Note Added" });
      onAdded?.();
      pop();
    } catch (error) {
      const handled = await handleApiError(error);
      if (!handled) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to add note",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle="Add Note"
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Note"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Note"
        placeholder="Write your note..."
        enableMarkdown
      />
    </Form>
  );
}
