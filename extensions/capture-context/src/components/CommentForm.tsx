import { Form, ActionPanel, Action, showHUD, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { FileService } from "../utils";
import type { CapturedData } from "../utils";

interface FormValues {
  comment: string;
}

interface CommentFormProps {
  data: CapturedData;
  filePath: string;
  onCommentSaved?: () => void;
}

export function CommentForm({ data, filePath, onCommentSaved }: CommentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: FormValues) {
    try {
      setIsSubmitting(true);
      const updatedData = {
        ...data,
        metadata: {
          ...data.metadata,
          comment: values.comment,
        },
      };
      await FileService.saveJSON(filePath, updatedData);
      await showHUD("✓ Added comment");
      onCommentSaved?.();
      await popToRoot();
    } catch (error) {
      console.error("Failed to save comment:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Save Comment",
        message: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Comment" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="comment"
        title="Comment"
        placeholder="Add any notes about this capture..."
        defaultValue={data.metadata.comment}
        enableMarkdown
      />
      <Form.Description
        title="Capture Info"
        text={`${data.source.app || "Unknown"} - ${new Date(data.metadata.timestamp).toLocaleString()}`}
      />
    </Form>
  );
}
