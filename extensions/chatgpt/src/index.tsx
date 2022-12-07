import {
  ActionPanel,
  Action,
  getPreferenceValues,
  Icon,
  openCommandPreferences,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import crypto from "crypto";
import { ChatGPTAPI } from "chatgpt";

type Preferences = {
  ChatGPTSessionToken: string;
};

type Message = {
  sent: string;
  received?: string;
  receivedId?: string;
};

export default function Command() {
  const { ChatGPTSessionToken } = getPreferenceValues<Preferences>();

  const [messageValue, setMessageValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useCachedState<Record<string, Message>>("messages", {});
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();

  const sendMessage = async () => {
    try {
      setIsLoading(true);
      const messageId = crypto.randomUUID();

      setMessages({
        [messageId]: {
          sent: messageValue,
        },
        ...messages,
      });
      setMessageValue("");
      setSelectedItemId(messageId);

      const api = new ChatGPTAPI({
        sessionToken: ChatGPTSessionToken,
      });

      await api.ensureAuth();

      const allMessages = Object.entries(messages);
      await api.sendMessage(messageValue, {
        conversationId,
        parentMessageId: allMessages[allMessages.length - 1]?.[1].receivedId,
        onConversationResponse: (conversationResponse) => {
          if (!conversationId) {
            setConversationId(conversationResponse.conversation_id);
            setMessages((previousMessages) => ({
              [messageId]: {
                ...previousMessages[messageId],
                receivedId: conversationResponse.message?.id,
              },
              ...previousMessages,
            }));
          }
        },
        onProgress: (progressResponse) => {
          console.log(progressResponse);
          setMessages((previousMessages) => ({
            [messageId]: {
              ...previousMessages[messageId],
              received: progressResponse,
            },
            ...previousMessages,
          }));
        },
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Unknown error.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetConversation = () => {
    setConversationId(undefined);
    setMessages({});
    setSelectedItemId(undefined);
  };

  return (
    <List
      searchBarPlaceholder="Enter message..."
      searchText={messageValue}
      onSearchTextChange={setMessageValue}
      isLoading={isLoading}
      selectedItemId={selectedItemId}
      actions={
        <ActionPanel>
          <Action title="Send" icon={Icon.Message} onAction={sendMessage} />
          <Action title="Change OpenAI API Key" icon={Icon.Gear} onAction={() => openCommandPreferences()} />
        </ActionPanel>
      }
      isShowingDetail={!!Object.entries(messages).length}
    >
      {Object.entries(messages).length ? (
        Object.entries(messages).map(([messageId, message]) => (
          <List.Item
            key={messageId}
            id={messageId}
            title={message.sent}
            detail={
              <List.Item.Detail
                markdown={`**You:**\n${message.sent}${message.received ? `\n\n**ChatGPT:**\n${message.received}` : ""}`}
              />
            }
            actions={
              <ActionPanel>
                <Action title="Send" icon={Icon.Message} onAction={sendMessage} />
                <Action title="Reset Conversation" icon={Icon.Repeat} onAction={resetConversation} />
                <Action title="Change OpenAI API Key" icon={Icon.Gear} onAction={() => openCommandPreferences()} />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView icon={Icon.Message} title="No messages" />
      )}
    </List>
  );
}
