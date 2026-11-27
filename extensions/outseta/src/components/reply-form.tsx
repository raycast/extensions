import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { caseTitle, personName } from "../lib/outseta/format";
import { Case } from "../lib/outseta/types";
import { getAgentName, getClient, showErrorToast } from "../lib/raycast";

export function ReplyForm({ supportCase, onSent }: { supportCase: Case; onSent: () => void }) {
  const { pop } = useNavigation();
  const agentName = getAgentName();
  const sender = agentName ? `"${agentName}"` : "your company name";
  const [error, setError] = useState<string>();
  const recipient = supportCase.FromPerson?.Email ?? personName(supportCase.FromPerson);

  async function handleSubmit(values: { reply: string }) {
    if (!values.reply.trim()) {
      setError("Write a reply first");
      return;
    }

    const confirmed = await confirmAlert({
      title: "Send reply?",
      message: `${recipient} will be emailed from ${sender}.`,
      icon: Icon.Envelope,
      primaryAction: { title: "Send", style: Alert.ActionStyle.Default },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Sending reply" });
    try {
      await getClient().replyToCase(supportCase, values.reply);
      toast.style = Toast.Style.Success;
      toast.title = "Reply sent";
      onSent();
      pop();
    } catch (err) {
      await toast.hide();
      await showErrorToast(err, "Couldn't send reply");
    }
  }

  return (
    <Form
      navigationTitle={`Reply: ${caseTitle(supportCase)}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Reply" icon={Icon.Envelope} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="To" text={recipient} />
      <Form.Description title="From" text={agentName || "Your company name"} />
      <Form.TextArea
        id="reply"
        title="Reply"
        placeholder="Plain text. Blank lines become paragraphs."
        error={error}
        onChange={() => setError(undefined)}
        autoFocus
      />
    </Form>
  );
}
