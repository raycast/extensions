import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { katoApi } from "./api";
import { hugeicon } from "./icons";

type CommentContext = {
  entityType: "task" | "record" | "meeting";
  entityId: string;
  label: string;
};

type Values = { comment: string };

export function CreateCommentForm({ context }: { context: CommentContext }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { pop } = useNavigation();

  async function submit(values: Values) {
    const comment = values.comment.trim();
    if (!comment) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Write a comment first",
      });
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding comment…",
    });
    try {
      await katoApi.addComment({
        entityType: context.entityType,
        entityId: context.entityId,
        comment,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Comment added";
      toast.message = context.label;
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not add comment";
      toast.message = (error as Error).message;
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Comment on ${context.label}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Comment"
            icon={hugeicon("comment-add")}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Add to"
        text={`${context.label} · ${context.entityType === "record" ? "Record activity" : context.entityType === "meeting" ? "Meeting overview" : "Task comments"}`}
      />
      <Form.TextArea
        id="comment"
        title="Comment"
        placeholder="Share an update…"
        autoFocus
      />
    </Form>
  );
}
