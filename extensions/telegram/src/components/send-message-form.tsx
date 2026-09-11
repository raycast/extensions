import { Form, ActionPanel, Action, Icon, showToast, Toast, popToRoot } from "@raycast/api";
import { Chat } from "../services/telegram-client";
import { useSendMessage } from "../hooks/use-send-message";

interface SendMessageFormProps {
  chat: Chat;
  onSuccess?: () => void;
}

export function SendMessageForm({ chat, onSuccess }: SendMessageFormProps) {
  const { handleSubmit, itemProps, isSubmitting } = useSendMessage({
    chatId: chat.id,
    onSuccess: async () => {
      await showToast({
        style: Toast.Style.Success,
        title: "Message Sent",
        message: `Message sent to ${chat.title}`,
      });

      onSuccess?.();
      await popToRoot();
    },
  });

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Send Message to ${chat.title}`}
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
