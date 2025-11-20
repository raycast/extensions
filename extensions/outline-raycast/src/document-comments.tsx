import {
  List,
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  Icon,
  useNavigation,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import { outlineApi, Comment } from "./api/outline";

interface DocumentCommentsProps {
  documentId: string;
  documentTitle: string;
}

interface ContentBlock {
  content?: { text?: string }[];
}

export default function DocumentComments({
  documentId,
  documentTitle,
}: DocumentCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, [documentId]);

  async function fetchComments() {
    setIsLoading(true);
    try {
      const data = await outlineApi.listComments(documentId);
      setComments(data);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load comments",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  function getCommentText(comment: Comment): string {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const textContent = (comment.data.content as ContentBlock[])
        .flatMap((block) => block.content || [])
        .filter((item) => item.text)
        .map((item) => item.text)
        .join(" ");
      return textContent || "No text content";
    } catch {
      return "Unable to parse comment";
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle={`Comments - ${documentTitle}`}>
      <List.Item
        title="Add New Comment"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Comment"
              target={
                <AddCommentForm
                  documentId={documentId}
                  onCommentAdded={fetchComments}
                />
              }
            />
          </ActionPanel>
        }
      />
      {comments.map((comment) => (
        <List.Item
          key={comment.id}
          title={comment.createdBy.name}
          subtitle={getCommentText(comment)}
          accessories={[{ date: new Date(comment.createdAt) }]}
          icon={Icon.Message}
        />
      ))}
    </List>
  );
}

interface AddCommentFormProps {
  documentId: string;
  onCommentAdded: () => void;
}

function AddCommentForm({ documentId, onCommentAdded }: AddCommentFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { text: string }) {
    if (!values.text) {
      showToast({
        style: Toast.Style.Failure,
        title: "Comment text is required",
      });
      return;
    }

    try {
      await outlineApi.createComment(documentId, values.text);
      showToast({
        style: Toast.Style.Success,
        title: "Comment added",
      });
      onCommentAdded();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to add comment",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Comment" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Comment"
        placeholder="Enter your comment..."
      />
    </Form>
  );
}
