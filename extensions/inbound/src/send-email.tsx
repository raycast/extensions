import { FormValidation, useForm } from "@raycast/utils";
import { inbound } from "./inbound";
import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";

export default function SendEmail() {
  interface FormValues {
    from: string;
    to: string;
    subject: string;
    bcc?: string;
    cc?: string;
    replyTo?: string;
    html?: string;
    text?: string;
  }
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Sending");
      try {
        await inbound.email.send(values);
        toast.style = Toast.Style.Success;
        toast.title = "Sent";
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      from: FormValidation.Required,
      to: FormValidation.Required,
      subject: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Envelope} title="Send Email" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="From" placeholder="Your Name <sender@domain.com>" {...itemProps.from} />
      <Form.TextField title="To" {...itemProps.to} />
      <Form.TextField title="Subject" {...itemProps.subject} />
      <Form.Separator />
      <Form.TextField title="BCC" {...itemProps.bcc} />
      <Form.TextField title="CC" {...itemProps.cc} />
      <Form.TextField title="Reply To" {...itemProps.replyTo} />
      <Form.TextArea title="HTML" {...itemProps.html} />
      <Form.TextArea title="Text" {...itemProps.text} />
    </Form>
  );
}
