import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { sendMessage } from "../jules";
import { Activity, Session } from "../types";

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.slice(0, Math.max(0, maxLength - 3)).trimEnd() + "...";
}

function getLastActivitySummary(activity?: Activity) {
  if (!activity) return "";
  if (activity.userMessaged) return `You: ${truncateText(activity.userMessaged.userMessage || "", 180)}`;
  if (activity.agentMessaged) return `Jules: ${truncateText(activity.agentMessaged.agentMessage || "", 180)}`;
  if (activity.planGenerated) return "Plan Generated";
  if (activity.progressUpdated) return `Progress Update: ${activity.progressUpdated.title || "Update"}`;
  if (activity.sessionCompleted) return "Session Completed";
  if (activity.sessionFailed) return `Session Failed: ${activity.sessionFailed.reason || "Unknown reason"}`;
  return "";
}

export default function QuickMessageForm(props: {
  session: Session;
  lastActivity?: Activity;
  onMessageSent?: () => void;
}) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ prompt: string }>({
    onSubmit: async (values) => {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Sending message" });
        await sendMessage(props.session.name, values.prompt.trim());
        await showToast({ style: Toast.Style.Success, title: "Message sent" });
        if (props.onMessageSent) props.onMessageSent();
        pop();
      } catch (e) {
        await showFailureToast(e, { title: "Failed sending message" });
      }
    },
    validation: {
      prompt: FormValidation.Required,
    },
  });

  const lastActivityText = getLastActivitySummary(props.lastActivity);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Message" icon={Icon.Message} onSubmit={handleSubmit} />
        </ActionPanel>
      }
      navigationTitle={`Message: ${props.session.title || props.session.id}`}
    >
      {lastActivityText && <Form.Description title="Last Activity" text={lastActivityText} />}
      <Form.TextArea
        title="Message"
        placeholder="Send a message to the session..."
        {...itemProps.prompt}
        enableMarkdown
      />
    </Form>
  );
}
