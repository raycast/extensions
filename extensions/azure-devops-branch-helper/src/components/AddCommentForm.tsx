import {
  Form,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { addCommentToWorkItem } from "../azure-devops";

interface AddCommentFormProps {
  workItemId: number;
  onPosted?: () => void;
}

export default function AddCommentForm({
  workItemId,
  onPosted,
}: AddCommentFormProps) {
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function submit() {
    const text = comment.trim();
    if (!text) {
      await showToast(Toast.Style.Failure, "Please enter a comment");
      return;
    }

    console.log(
      "[AddCommentForm] Submitting comment for work item:",
      workItemId,
    );
    console.log("[AddCommentForm] Comment length:", text.length);

    setIsLoading(true);
    try {
      const result = await addCommentToWorkItem(workItemId, text);
      console.log("[AddCommentForm] Result:", result);

      if (result.success) {
        await showToast(Toast.Style.Success, "Comment posted");
        setComment(""); // Clear the form
        if (onPosted) onPosted();
      } else {
        const msg = result.error
          ? String(result.error).slice(0, 240)
          : "Unknown error";
        console.error("[AddCommentForm] Post failed:", {
          workItemId,
          error: result.error,
          truncatedMsg: msg,
        });
        await showToast(Toast.Style.Failure, "Failed to post comment", msg);
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      const msg = errorObj?.message || String(err);
      console.error("[AddCommentForm] Unexpected error:", {
        workItemId,
        error: err,
        message: msg,
      });
      await showToast(Toast.Style.Failure, "Failed to post comment", msg);
    }
    setIsLoading(false);
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Post Comment" icon={Icon.Pencil} onAction={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="comment"
        title="Comment"
        placeholder="Type your comment..."
        value={comment}
        onChange={setComment}
        enableMarkdown
      />
    </Form>
  );
}
