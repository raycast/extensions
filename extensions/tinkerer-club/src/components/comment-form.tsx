import { Action, ActionPanel, Alert, Form, Icon, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { TinkererCommunity } from "../api/community";
import { errorMessage } from "../lib/json";

interface CommentFormProps {
  community: TinkererCommunity;
  onCreated: () => void;
  parentId?: string;
  postId: string;
}

interface CommentFormValues {
  content: string;
}

export function CommentForm({ community, onCreated, parentId, postId }: CommentFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const isReply = Boolean(parentId);

  async function submit(values: CommentFormValues) {
    const content = values.content.trim();
    if (!content) {
      await showToast({ style: Toast.Style.Failure, title: isReply ? "Reply Is Empty" : "Comment Is Empty" });
      return;
    }
    if (content.length > 5_000) {
      await showToast({
        style: Toast.Style.Failure,
        title: isReply ? "Reply Is Too Long" : "Comment Is Too Long",
        message: "The limit is 5,000 characters.",
      });
      return;
    }

    const action = isReply ? "Post Reply" : "Post Comment";
    const confirmed = await confirmAlert({
      title: `${action}?`,
      message: content.length > 240 ? `${content.slice(0, 237)}…` : content,
      primaryAction: { title: action, style: Alert.ActionStyle.Default },
    });
    if (!confirmed) return;

    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: `${action}…` });
    try {
      await community.addComment(postId, content, parentId);
      toast.style = Toast.Style.Success;
      toast.title = isReply ? "Reply Posted" : "Comment Posted";
      onCreated();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = isReply ? "Could Not Post Reply" : "Could Not Post Comment";
      toast.message = errorMessage(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={isReply ? "Reply" : "Comment"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isReply ? "Review Reply" : "Review Comment"} icon={Icon.Reply} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title={isReply ? "Reply" : "Comment"}
        placeholder={isReply ? "Write a reply…" : "Join the conversation…"}
        autoFocus
      />
      <Form.Description text="You will review and confirm before this is posted." />
    </Form>
  );
}
