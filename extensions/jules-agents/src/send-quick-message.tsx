import { Action, ActionPanel, Form, LaunchProps, showToast, Toast } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { sendMessage } from "./jules";
import { Session } from "./types";

export default function SendQuickMessage(props: LaunchProps<{ launchContext: { session: Session } }>) {
  const { session } = props.launchContext;

  const { handleSubmit, itemProps } = useForm<{ prompt: string }>({
    onSubmit: async (values) => {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Sending message" });
        await sendMessage(session.name, values.prompt.trim());
        await showToast({ style: Toast.Style.Success, title: "Message sent" });
      } catch (e) {
        await showFailureToast(e, { title: "Failed sending message" });
      }
    },
    validation: {
      prompt: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Message" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Message"
        placeholder="Send a message to the session..."
        {...itemProps.prompt}
        enableMarkdown
      />
    </Form>
  );
}
