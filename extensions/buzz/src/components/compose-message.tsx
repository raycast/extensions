import { useRef } from "react";
import { Form, ActionPanel, Action, showToast, Toast, popToRoot } from "@raycast/api";
import { errorMessage } from "../lib/errors";
import type { BuzzClient } from "../lib/buzz-client";

/**
 * The compose step, shared by every way of picking a destination. A Buzz DM is
 * an ordinary private channel, so sending to a person and sending to a channel
 * are the same publish and deliberately the same form.
 */
export function ComposeMessage(props: { client: BuzzClient; channelId: string; destination: string }) {
  // A ref rather than state: two Enter presses can land in the same tick, before
  // React has re-rendered, and a state flag would still read false for the
  // second one. The message is publicly visible and this extension offers no
  // delete, so a duplicate send is not something the user can take back.
  const sending = useRef(false);

  async function onSubmit(values: { content: string }) {
    if (sending.current) return;
    if (!values.content.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Message is empty" });
      return;
    }
    sending.current = true;
    try {
      await props.client.sendMessage(props.channelId, values.content);
      await showToast({ style: Toast.Style.Success, title: "Message sent" });
      await popToRoot();
    } catch (e) {
      // The form stays open on failure so the typed message is not lost.
      await showToast({
        style: Toast.Style.Failure,
        title: "Send failed",
        message: errorMessage(e),
      });
    } finally {
      // Released either way: a failed send leaves the form open, and the retry
      // it exists to allow must not be swallowed by the guard.
      sending.current = false;
    }
  }

  return (
    <Form
      navigationTitle={`Message ${props.destination}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`To: ${props.destination}`} />
      <Form.TextArea id="content" title="Message" placeholder="Type your message" />
    </Form>
  );
}
