import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { showError } from "../lib/errors";

interface Props {
  itemTitle: string;
  onSubmit: (text: string) => Promise<unknown>;
  onSaved?: () => void;
}

export function CommentForm({ itemTitle, onSubmit, onSaved }: Props) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ text: string }>({
    validation: { text: FormValidation.Required },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Adding comment…" });
      try {
        await onSubmit(values.text.trim());
        toast.style = Toast.Style.Success;
        toast.title = "Comment added";
        onSaved?.();
        pop();
      } catch (error) {
        toast.hide();
        await showError(error, "Couldn't add comment");
      }
    },
  });

  return (
    <Form
      navigationTitle="Add Comment"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Comment" icon={Icon.Bubble} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="On" text={itemTitle} />
      <Form.TextArea title="Comment" placeholder="Write a comment" {...itemProps.text} />
    </Form>
  );
}
