import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { addWorkItemComment } from "../api/comments";
import { describePlaneError } from "../helpers/errors";

type AddCommentFormProps = {
  projectId: string;
  workItemId: string;
  identifier: string;
  onCommentAdded?: () => void;
};

export default function AddCommentForm({ projectId, workItemId, identifier, onCommentAdded }: AddCommentFormProps) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ comment: string }>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: `Adding comment to ${identifier}` });
      try {
        await addWorkItemComment({ projectId, workItemId, markdown: values.comment });
        toast.style = Toast.Style.Success;
        toast.title = `Comment added to ${identifier}`;
        onCommentAdded?.();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to add comment";
        toast.message = describePlaneError(error).message;
      }
    },
    validation: { comment: FormValidation.Required },
  });

  return (
    <Form
      navigationTitle={`Comment on ${identifier}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Comment" icon={Icon.Bubble} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Comment"
        placeholder="Write a comment (supports Markdown)"
        enableMarkdown
        {...itemProps.comment}
      />
    </Form>
  );
}
