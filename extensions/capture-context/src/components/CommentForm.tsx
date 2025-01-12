import { Form, ActionPanel, Action, showHUD, Toast } from "@raycast/api";
import { useState } from "react";
import { utils } from "../utils";
import type { CapturedData } from "../utils";

interface CommentFormProps {
  data: CapturedData;
  filePath: string;
  onCommentSaved?: () => void;
}

export function CommentForm({ data, filePath, onCommentSaved }: CommentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { comment: string }) {
    if (!values.comment?.trim()) return;

    setIsSubmitting(true);
    try {
      await utils.handleComment(data, filePath, values.comment);
      await showHUD("Comment saved");
      onCommentSaved?.();
    } catch (error) {
      console.error("Failed to save comment:", error);
      await utils.showToast({
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
        placeholder="Add your comment here..."
        defaultValue={data.comment}
        enableMarkdown
      />
    </Form>
  );
}
