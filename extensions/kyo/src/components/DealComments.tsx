import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Comments } from "../api/resources";
import type { CommentEntityType } from "../api/types";
import { formatDate, showKyoError } from "../lib/helpers";

/** Reusable comment thread for a deal OR a task (entity_type must be one of these). */
export function CommentsList({
  entityType,
  entityId,
  title,
}: {
  entityType: CommentEntityType;
  entityId: string;
  title: string;
}) {
  const { data, isLoading, revalidate } = useCachedPromise(
    (t: CommentEntityType, id: string) => Comments.list(t, id),
    [entityType, entityId],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading} navigationTitle={`Comments · ${title}`}>
      <List.EmptyView
        title="No comments yet"
        description="Add the first comment on this thread."
        icon={Icon.SpeechBubble}
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Comment"
              icon={Icon.Plus}
              target={
                <AddCommentForm
                  entityType={entityType}
                  entityId={entityId}
                  onAdded={revalidate}
                />
              }
            />
          </ActionPanel>
        }
      />
      {data.map((comment) => (
        <List.Item
          key={comment.id}
          icon={Icon.SpeechBubble}
          title={comment.content}
          accessories={[{ text: formatDate(comment.created_at) }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Comment"
                icon={Icon.Plus}
                target={
                  <AddCommentForm
                    entityType={entityType}
                    entityId={entityId}
                    onAdded={revalidate}
                  />
                }
              />
              <Action.CopyToClipboard
                title="Copy Comment"
                content={comment.content}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function AddCommentForm({
  entityType,
  entityId,
  onAdded,
}: {
  entityType: CommentEntityType;
  entityId: string;
  onAdded?: () => void;
}) {
  const { pop } = useNavigation();

  async function submit(values: { content: string }) {
    if (!values.content.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Comment is empty",
      });
      return;
    }
    try {
      await Comments.create(entityType, entityId, values.content.trim());
      await showToast({ style: Toast.Style.Success, title: "Comment added" });
      onAdded?.();
      pop();
    } catch (error) {
      await showKyoError(error, "Failed to add comment");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Comment"
            icon={Icon.Plus}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Comment"
        placeholder="Write a comment…"
        autoFocus
      />
    </Form>
  );
}
