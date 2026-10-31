import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import type { ReactNode } from "react";

export function ChatComposer(props: {
  initialText: string;
  description?: string;
  imageName?: string;
  extraActions?: ReactNode;
  onSubmit: (text: string) => void;
}) {
  function submit(values: { message: string }) {
    if (values.message.trim().length === 0) return;
    props.onSubmit(values.message);
  }

  return (
    <Form
      navigationTitle="Reply"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Message" icon={Icon.Message} onSubmit={submit} />
          {props.extraActions}
        </ActionPanel>
      }
    >
      {props.description && <Form.Description text={props.description} />}
      {props.imageName && <Form.Description title="Image" text={props.imageName} />}
      <Form.TextArea id="message" title="Message" placeholder="Ask a question..." defaultValue={props.initialText} />
    </Form>
  );
}
