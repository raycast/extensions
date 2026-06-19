import { Action, ActionPanel, Form, Icon, showToast, Toast, popToRoot } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { AuthGuard } from "./lib/auth-guard";
import { runHey } from "./lib/hey";

type ComposeValues = {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
};

export default function ComposeEmailCommand() {
  return (
    <AuthGuard>
      <ComposeForm />
    </AuthGuard>
  );
}

function ComposeForm() {
  const { handleSubmit, itemProps } = useForm<ComposeValues>({
    onSubmit: async (values) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Sending email…" });
      try {
        const args = ["compose", "--to", values.to.trim(), "--subject", values.subject.trim(), "-m", values.body];
        if (values.cc?.trim()) {
          args.push("--cc", values.cc.trim());
        }
        if (values.bcc?.trim()) {
          args.push("--bcc", values.bcc.trim());
        }
        await runHey(args);
        toast.style = Toast.Style.Success;
        toast.title = "Email sent";
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Send failed";
        toast.message = error instanceof Error ? error.message : "Unknown error";
      }
    },
    validation: {
      to: FormValidation.Required,
      subject: FormValidation.Required,
      body: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Email" icon={Icon.Paperplane} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="to" title="To" placeholder="someone@example.com" {...itemProps.to} />
      <Form.TextField id="cc" title="CC" placeholder="Optional" {...itemProps.cc} />
      <Form.TextField id="bcc" title="BCC" placeholder="Optional" {...itemProps.bcc} />
      <Form.TextField id="subject" title="Subject" placeholder="Subject" {...itemProps.subject} />
      <Form.TextArea id="body" title="Body" placeholder="Write your message…" {...itemProps.body} />
    </Form>
  );
}
