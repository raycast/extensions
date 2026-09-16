import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { sendFeedback } from "../lib/api";
import { failToast } from "../lib/feedback";

/** A short form to send real feedback to the Reassign team (POST /feedback). */
export function FeedbackForm() {
  const { pop } = useNavigation();

  async function submit(values: { message: string }) {
    const message = values.message.trim();
    if (!message) {
      await showToast({ style: Toast.Style.Failure, title: "Write a message first" });
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Sending…" });
    const result = await sendFeedback(message);
    if (result.ok) {
      toast.style = Toast.Style.Success;
      toast.title = "Thanks — feedback sent";
      pop();
      return;
    }
    failToast(toast, result);
  }

  return (
    <Form
      navigationTitle="Send Feedback"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Feedback" icon={Icon.Envelope} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="message" title="Message" placeholder="What's working, what's not…" />
    </Form>
  );
}
