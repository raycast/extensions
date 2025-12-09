import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { addComment } from "../../utils/jira";

export function AddComment({ issueKey }: { issueKey: string }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { comment: string }) {
    try {
      showToast({ style: Toast.Style.Animated, title: "Adding comment..." });
      await addComment(issueKey, values.comment);
      showToast({ style: Toast.Style.Success, title: "Comment added" });
      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to add comment", message: String(error) });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Add Comment" />
        </ActionPanel>
      }
    >
      <Form.Description title="Issue" text={issueKey} />
      <Form.TextArea id="comment" title="Comment" placeholder="Write your comment here..." />
    </Form>
  );
}
