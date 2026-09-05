import { useState } from "react";
import { Form, ActionPanel, Action, Icon, showToast, Toast, popToRoot } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { getChats, getChatTopics } from "./services/telegram-client";
import { getConfig, ensureAuthenticated } from "./utils/auth";
import { useSendMessage } from "./hooks/use-send-message";

export default function SendMessage() {
  const [selectedChatId, setSelectedChatId] = useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");

  const { data: chats = [], isLoading: isLoadingChats } = usePromise(async () => {
    const authenticated = await ensureAuthenticated();
    if (!authenticated) {
      return [];
    }

    const config = getConfig();
    return await getChats({ config, limit: 100 });
  }, []);

  const selectedChat = chats.find((chat) => chat.id === selectedChatId);
  const { data: topics, isLoading: isLoadingTopics } = useCachedPromise(
    async (chatId: string) => {
      if (!chatId || !chats.find((chat) => chat.id === chatId)?.isForum) {
        return [];
      }

      const authenticated = await ensureAuthenticated();
      if (!authenticated) {
        return [];
      }

      return await getChatTopics({ config: getConfig(), chatId });
    },
    [selectedChatId],
    { initialData: [] },
  );

  const { handleSubmit, itemProps, isSubmitting } = useSendMessage({
    chatId: selectedChatId,
    topicId: selectedTopicId ? Number(selectedTopicId) : undefined,
    onBeforeSubmit: async () => {
      if (!selectedChatId) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Chat Selected",
          message: "Please select a chat",
        });
        return false;
      }
      if (selectedChat?.isForum && !selectedTopicId) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Topic Selected",
          message: "Please select a topic in this forum group",
        });
        return false;
      }
      return true;
    },
    onSuccess: async ({ chatId }) => {
      const selectedChat = chats.find((chat) => chat.id === chatId);
      const selectedTopic = topics.find((topic) => topic.id.toString() === selectedTopicId);
      await showToast({
        style: Toast.Style.Success,
        title: "Message Sent",
        message: `Message sent to ${selectedTopic ? `${selectedChat?.title} · ${selectedTopic.title}` : selectedChat?.title || "chat"}`,
      });
      await popToRoot();
    },
  });

  return (
    <Form
      isLoading={isLoadingChats || isLoadingTopics || isSubmitting}
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
        onChange={(chatId) => {
          setSelectedChatId(chatId);
          setSelectedTopicId("");
        }}
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

      {selectedChat?.isForum ? (
        <Form.Dropdown
          id="topic"
          title="Topic"
          placeholder="Select a topic"
          value={selectedTopicId}
          onChange={setSelectedTopicId}
        >
          {topics.map((topic) => (
            <Form.Dropdown.Item
              key={topic.id}
              value={topic.id.toString()}
              title={topic.title}
              icon={topic.isClosed ? Icon.Lock : Icon.Hashtag}
            />
          ))}
        </Form.Dropdown>
      ) : null}

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
