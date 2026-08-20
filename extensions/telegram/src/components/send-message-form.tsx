import { Form, ActionPanel, Action, Icon, showToast, Toast, popToRoot } from "@raycast/api";
import { Chat, ChatTopic } from "../services/telegram-client";
import { useSendMessage } from "../hooks/use-send-message";

interface SendMessageFormProps {
  chat: Chat;
  topic?: ChatTopic;
  onSuccess?: () => void;
}

export function SendMessageForm({ chat, topic, onSuccess }: SendMessageFormProps) {
  const destination = topic ? `${chat.title} · ${topic.title}` : chat.title;
  const { handleSubmit, itemProps, isSubmitting } = useSendMessage({
    chatId: chat.id,
    topicId: topic?.id,
    onSuccess: async () => {
      await showToast({
        style: Toast.Style.Success,
        title: "Message Sent",
        message: `Message sent to ${destination}`,
      });

      onSuccess?.();
      await popToRoot();
    },
  });

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Send to ${destination}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.ArrowRight} title="Send Message" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Message" placeholder="Enter your message..." enableMarkdown {...itemProps.message} />

      <Form.FilePicker
        title="Attachments"
        allowMultipleSelection={true}
        canChooseDirectories={false}
        {...itemProps.files}
      />

      <Form.Description
        title="Note"
        text="You can attach photos, videos, or documents. Multiple files will be sent as separate messages."
      />
    </Form>
  );
}
