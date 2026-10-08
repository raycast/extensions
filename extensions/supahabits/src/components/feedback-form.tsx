import { Action, ActionPanel, Form, getPreferenceValues, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import fetch from "node-fetch";
import { showFailureToast } from "@raycast/utils";

export default function FeedbackForm() {
  const { secret } = getPreferenceValues<Preferences>();
  const { pop } = useNavigation();

  const submitFeedback = async (values: { message: string }) => {
    const { message } = values;

    if (!message || message === "") {
      showFailureToast("🚫 Feedback message is required");
      return;
    }

    try {
      await fetch(`https://www.supahabits.com/api/support`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ secret, message }),
      });
      showToast({ style: Toast.Style.Success, title: "✅ Feedback submitted successfully" });
      pop();
    } catch (error) {
      showFailureToast("🚫 Failed to submit feedback");
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Feedback" icon={Icon.Envelope} onSubmit={submitFeedback} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="Feedback"
        placeholder="Please share your thoughts, suggestions or report any issues..."
      />
      <Form.Description
        title="Note"
        text="Your feedback helps us improve SupaHabits. Thank you for taking the time to share it!"
      />
    </Form>
  );
}
