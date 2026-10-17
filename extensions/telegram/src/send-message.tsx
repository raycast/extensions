import { useState } from "react";
import { Form, ActionPanel, Action, Icon, showToast, Toast, popToRoot } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getChats } from "./services/telegram-client";
import { getConfig, requireAuthenticated, showTelegramError } from "./utils/auth";
import { useSendMessage } from "./hooks/use-send-message";

import { isTelegramAuthenticationError } from "./utils/errors";
import { AuthenticationRequired } from "./components/authentication-required";

export default function SendMessage() {
  const [selectedChatId, setSelectedChatId] = useState<string>("");

  const {
    error,
    data: chats,
    isLoading: isLoadingChats,
  } = useCachedPromise(
    async () => {
      await requireAuthenticated();

      const config = getConfig();
      return await getChats({ config, limit: 100 });
    },
    [],
    {
      initialData: [],
      onError: showTelegramError,
    },
  );

  const { handleSubmit, itemProps, isSubmitting } = useSendMessage({
    chatId: selectedChatId,
    onBeforeSubmit: async () => {
      if (!selectedChatId) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Chat Selected",
          message: "Please select a chat",
        });
        return false;
      }
      return true;
    },
    onSuccess: async ({ chatId }) => {
      const selectedChat = chats.find((chat) => chat.id === chatId);
      await showToast({
        style: Toast.Style.Success,
        title: "Message Sent",
        message: `Message sent to ${selectedChat?.title || "chat"}`,
      });
      await popToRoot();
    },
  });

  if (isTelegramAuthenticationError(error)) return <AuthenticationRequired form />;

  return (
    <Form
      isLoading={isLoadingChats || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.ArrowRight} title="Send Message" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="chat"
        title="Chat"
        placeholder="Select a chat"
        value={selectedChatId}
        onChange={setSelectedChatId}
      >
        {chats
          .filter((chat) => chat.isPinned)
          .map((chat) => (
            <Form.Dropdown.Item
              key={chat.id}
              value={chat.id}
              title={chat.title}
              icon={chat.type === "private" ? Icon.Person : Icon.TwoPeople}
            />
          ))}
        {chats.filter((chat) => chat.isPinned).length > 0 && <Form.Dropdown.Section title="All Chats" />}
        {chats
          .filter((chat) => !chat.isPinned)
          .map((chat) => (
            <Form.Dropdown.Item
              key={chat.id}
              value={chat.id}
              title={chat.title}
              icon={chat.type === "private" ? Icon.Person : Icon.TwoPeople}
            />
          ))}
      </Form.Dropdown>

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
