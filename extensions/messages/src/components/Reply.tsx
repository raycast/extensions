import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";

import { getAttachmentType, sendMessage } from "../helpers";
import { Message } from "../hooks/useMessages";

type ReplyProps = {
  message: Message;
  initialReply?: string;
};

export default function Reply({ message, initialReply }: ReplyProps) {
  const { pop } = useNavigation();

  const attachmentType = getAttachmentType(message);

  const { handleSubmit, itemProps } = useForm<{ reply: string; prompt: string }>({
    async onSubmit(values) {
      try {
        await sendMessage({
          address: message.sender,
          text: values.reply,
          service_name: message.service,
          group_name: message.group_name,
        });
        pop();
      } catch (error) {
        await showFailureToast(error, { title: "Failed to send message" });
      }
    },
    validation: {
      reply: FormValidation.Required,
    },
    initialValues: {
      reply: initialReply || "",
    },
  });

  return (
    <Form
      navigationTitle={`Replying to ${message.senderName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Reply} title="Send Reply" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Message" text={attachmentType?.text ?? message.body} />
      <Form.TextArea {...itemProps.reply} title="Reply" placeholder="Type your reply here…" />
    </Form>
  );
}
