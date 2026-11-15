import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useRef, useState } from "react";
import { runOtty, showFailure } from "../lib/otty";
import { buildSendTextArgs } from "../lib/otty-core";

export function SendMessageForm({ paneId, title }: { paneId: string; title: string }) {
  const { pop } = useNavigation();
  const [messageError, setMessageError] = useState<string>();
  const submitInFlight = useRef(false);
  const [isSending, setIsSending] = useState(false);

  async function send(values: { message: string }) {
    if (submitInFlight.current) return;
    if (!values.message.trim()) {
      setMessageError("Type a message to send");
      return;
    }
    submitInFlight.current = true;
    setIsSending(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Sending to ${title}`,
    });
    try {
      await runOtty(buildSendTextArgs(paneId, values.message));
      toast.style = Toast.Style.Success;
      toast.title = `Queued for ${title}`;
      pop();
    } catch (error) {
      submitInFlight.current = false;
      setIsSending(false);
      await showFailure(`Could not send to ${title}`, error);
    }
  }

  return (
    <Form
      isLoading={isSending}
      navigationTitle={`Send to ${title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Message" icon={Icon.Message} onSubmit={send} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="Message"
        placeholder="Review the diff and report only real bugs"
        error={messageError}
        onChange={() => setMessageError(undefined)}
      />
      <Form.Description text="Sent through Otty's Prompt Queue: an agent gets it as soon as its turn ends." />
    </Form>
  );
}
