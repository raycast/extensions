import { Action, ActionPanel, Form, Icon, open, showHUD } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";

interface FormValues {
  name: string;
  email: string;
  content: string;
}

const RECIPIENT_EMAIL = "raycastweekly@substack.com";

export default function Command() {
  const { handleSubmit, itemProps, reset, values } = useForm<FormValues>({
    onSubmit: async (values) => {
      try {
        const mailtoUrl = buildMailtoUrl(values);
        await open(mailtoUrl);
        await showHUD("Opening email client...");
        reset();
      } catch (error) {
        showFailureToast(error, { title: "Failed to open email client" });
      }
    },
    validation: {
      name: (value) => {
        if (!value || value.trim().length === 0) {
          return "Name is required";
        }
      },
      email: (value) => {
        if (!value || value.trim().length === 0) {
          return "Email is required";
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return "Please enter a valid email address";
        }
      },
      content: (value) => {
        if (!value || value.trim().length < 32) {
          return "Content must be at least 32 characters";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Envelope} title="Send Email" onSubmit={handleSubmit} />
          <Action.CopyToClipboard
            title="Copy Mailto Link"
            content={buildMailtoUrl(values)}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action icon={Icon.Trash} title="Clear Form" shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={reset} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Submit Content"
        text="Submit your content to be featured in the Raycast Weekly newsletter, or feel free to share your ideas or feedback for the newsletter!"
      />
      <Form.TextField title="Name" placeholder="Your name" {...itemProps.name} />
      <Form.TextField title="Email" placeholder="your@email.com" {...itemProps.email} />
      <Form.TextArea
        title="Content"
        placeholder="Describe your content idea, suggestion, or feedback..."
        enableMarkdown
        {...itemProps.content}
      />
      <Form.Separator />
      <Form.Description title="Note" text={`Your submission will be sent to ${RECIPIENT_EMAIL}`} />
    </Form>
  );
}

function buildMailtoUrl(values: FormValues): string {
  const subject = encodeURIComponent("RW: Content Submission");
  const body = encodeURIComponent(`Name: ${values.name}\nEmail: ${values.email}\n\n${values.content}`);

  return `mailto:${RECIPIENT_EMAIL}?subject=${subject}&body=${body}`;
}
