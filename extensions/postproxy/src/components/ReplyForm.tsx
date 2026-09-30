import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";

/** Reusable single-field reply/compose form for comments and direct messages. */
export function ReplyForm({
  title,
  placeholder,
  submitTitle,
  onSend,
  onDone,
}: {
  title: string;
  placeholder?: string;
  submitTitle?: string;
  onSend: (text: string) => Promise<unknown>;
  onDone?: () => void;
}) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ text: string }>({
    async onSubmit({ text }) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Sending…" });
      try {
        await onSend(text);
        toast.style = Toast.Style.Success;
        toast.title = "Sent";
        onDone?.();
        pop();
      } catch (error) {
        await showFailureToast(error, { title: "Failed to send" });
      }
    },
    validation: { text: FormValidation.Required },
  });

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle ?? "Send"} icon={Icon.Reply} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title={title} placeholder={placeholder ?? "Write a reply…"} {...itemProps.text} />
    </Form>
  );
}
