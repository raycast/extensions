import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { createClient, promptSession } from "../lib/opencode";
import type { OpencodeTarget } from "../lib/types";

type ReplyFormProps = {
  serverUrl: string;
  target: OpencodeTarget;
  sessionID: string;
  onSent: () => Promise<void>;
};

type ReplyValues = {
  prompt: string;
};

export function ReplyForm(props: ReplyFormProps) {
  const client = useMemo(
    () => createClient(props.serverUrl),
    [props.serverUrl],
  );
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Reply"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Reply"
            onSubmit={async (values: ReplyValues) => {
              const text = values.prompt.trim();
              if (!text) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Reply is required",
                });
                return;
              }

              setIsSubmitting(true);
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Sending reply...",
              });
              try {
                await promptSession(client, {
                  target: props.target,
                  sessionID: props.sessionID,
                  text,
                });
                toast.style = Toast.Style.Success;
                toast.title = "Reply sent";
                await props.onSent();
                pop();
              } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = "Failed to send reply";
                toast.message =
                  error instanceof Error ? error.message : String(error);
              } finally {
                setIsSubmitting(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Send a follow-up in this conversation." />
      <Form.TextArea
        id="prompt"
        title="Reply"
        placeholder="Type your follow-up..."
      />
    </Form>
  );
}
