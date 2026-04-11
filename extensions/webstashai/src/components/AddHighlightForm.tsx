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
import { createHighlight, handleApiError } from "../api/client";

export default function AddHighlightForm({
  pageId,
  sourceUrl,
  onAdded,
}: {
  pageId: string;
  sourceUrl: string;
  onAdded?: () => void;
}) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { text: string; note: string }) {
    const text = values.text.trim();
    if (!text) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Highlight text cannot be empty",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createHighlight(pageId, {
        text,
        note: values.note.trim() || undefined,
        source_url: sourceUrl,
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Highlight Added",
      });
      onAdded?.();
      pop();
    } catch (error) {
      const handled = await handleApiError(error);
      if (!handled) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to add highlight",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle="Add Highlight"
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Highlight"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Highlight Text"
        placeholder="Paste the passage you want to highlight..."
      />
      <Form.TextArea
        id="note"
        title="Note"
        placeholder="Optional note about this highlight..."
        enableMarkdown
      />
    </Form>
  );
}
