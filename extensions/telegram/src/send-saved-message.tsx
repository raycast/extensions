import { Form, ActionPanel, Action, Icon, showToast, Toast, popToRoot } from "@raycast/api";
import { useSendMessage } from "./hooks/use-send-message";

export default function SendSavedMessage() {
  const { handleSubmit, itemProps, isSubmitting } = useSendMessage({
    chatId: "me",
    onSuccess: async () => {
      await showToast({
        style: Toast.Style.Success,
        title: "Message Sent",
        message: "Message sent to Saved Messages",
      });
      await popToRoot();
    },
  });

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.ArrowRight} title="Send Message" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Message" placeholder="Enter your message..." enableMarkdown {...itemProps.message} />

      <Form.FilePicker
        title="Attachments"
        info="You can attach photos, videos, or documents. Multiple files will be sent as separate messages."
        allowMultipleSelection={true}
        canChooseDirectories={false}
        {...itemProps.files}
      />
    </Form>
  );
}
