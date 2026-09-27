import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { hub } from "../lib/hub";
import { Agent } from "../lib/types";

/** Type a message into a hosted agent. */
export function MessageForm(props: { agent: Agent; initial?: string; onSent?: () => void }) {
  const { pop } = useNavigation();

  async function submit(values: { message: string }) {
    const text = values.message.trim();
    if (!text) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: `Sending to ${props.agent.name}…` });
    try {
      await hub(["send", props.agent.id, text]);
      toast.style = Toast.Style.Success;
      toast.title = `Sent to ${props.agent.name}`;
      props.onSent?.();
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't send" });
    }
  }

  return (
    <Form
      navigationTitle={`Message ${props.agent.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" icon={Icon.Message} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="message" title="Message" defaultValue={props.initial} placeholder="What should it do next?" />
      <Form.Description text={props.agent.statusDetail ?? props.agent.reported ?? props.agent.currentTask ?? ""} />
    </Form>
  );
}
