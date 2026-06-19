import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { runHey } from "../lib/hey";

type ReplyFormProps = {
  topicId: string;
  subject?: string;
};

export function ReplyForm({ topicId, subject }: ReplyFormProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{ body: string }>({
    onSubmit: async (values) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Sending reply…" });
      try {
        await runHey(["reply", topicId, "-m", values.body]);
        toast.style = Toast.Style.Success;
        toast.title = "Reply sent";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Reply failed";
        toast.message = error instanceof Error ? error.message : "Unknown error";
      }
    },
    validation: {
      body: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Reply" icon={Icon.Paperplane} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {subject ? <Form.Description title="Subject" text={subject} /> : null}
      <Form.TextArea id="body" title="Message" placeholder="Write your reply…" {...itemProps.body} />
    </Form>
  );
}
