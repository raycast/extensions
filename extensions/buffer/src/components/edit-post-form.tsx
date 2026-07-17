import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { editPost } from "../lib/buffer";
import { Post } from "../lib/types";

interface FormValues {
  text: string;
  dueAt: Date | null;
}

export function EditPostForm({ post, onSaved }: { post: Post; onSaved?: () => void }) {
  const { pop } = useNavigation();
  const isScheduled = !!post.dueAt && post.status !== "sent";

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      if (isScheduled && !values.dueAt) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Pick a schedule date",
          message: "Clearing the date is not supported here – edit it in Buffer instead.",
        });
        return;
      }
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Saving…",
      });
      try {
        await editPost({
          id: post.id,
          text: values.text,
          dueAt: isScheduled && values.dueAt ? values.dueAt.toISOString() : undefined,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Post updated";
        onSaved?.();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to update post";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
    initialValues: {
      text: post.text ?? "",
      dueAt: post.dueAt ? new Date(post.dueAt) : null,
    },
    validation: {
      text: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Text" placeholder="Post content" {...itemProps.text} />
      {isScheduled && <Form.DatePicker title="Scheduled For" {...itemProps.dueAt} />}
    </Form>
  );
}
