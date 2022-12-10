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

  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useCachedState<Record<string, Message>>("messages", {});
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const [abortController, setAbortController] = useState<AbortController>();

  const sendMessage = async () => {
    try {
      abortController?.abort();
      const abortControllerInstance = new AbortController();
      setAbortController(abortControllerInstance);
      
      setIsLoading(true);
      const messageId = crypto.randomUUID();

      setMessages({
        ...messages,
        [messageId]: {
          sent: inputValue,
        },
      });

      setInputValue("");
      setSelectedItemId(messageId);

      const api = new ChatGPTAPI({
        sessionToken: ChatGPTSessionToken,
      });

      await api.ensureAuth();

      const allMessages = Object.entries(messages);
      await api.sendMessage(inputValue, {
        conversationId,
        parentMessageId: allMessages[allMessages.length - 1]?.[1].receivedId,
        onConversationResponse: (conversationResponse) => {
          if (abortControllerInstance.signal.aborted) {
            // abort doesn't really stop server from sending events, this just stops storing them
            return;
          }
          if (!conversationId) {
            setConversationId(conversationResponse.conversation_id);
          }
          setMessages((previousMessages) => {
            return {
              ...previousMessages,
              [messageId]: {
                ...previousMessages[messageId],
                receivedId: conversationResponse.message?.id,
              },
            };
          });
        },
        onProgress: (progressResponse) => {
          if (abortControllerInstance.signal.aborted) {
            // abort doesn't really stop server from sending events, this just stops storing them
            return;
          }
          setMessages((previousMessages) => ({
            ...previousMessages,
            [messageId]: {
              ...previousMessages[messageId],
              received: progressResponse,
            },
          }));
        },
        abortSignal: abortControllerInstance.signal,
      });

      setIsLoading(false);
      setAbortController(undefined);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // AbortError is expected, don't do anything
        return;
      }

      console.error(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Unknown error.",
      });
      setIsLoading(false);
      setAbortController(undefined);
    }
  };

  const resetConversation = () => {
    abortController?.abort();
    setConversationId(undefined);
    setMessages({});
    setSelectedItemId(undefined);
    setIsLoading(false);
  };

  return (
    <List
      searchBarPlaceholder="Enter message..."
      searchText={inputValue}
      onSearchTextChange={setInputValue}
      isLoading={isLoading}
      selectedItemId={selectedItemId}
      actions={
        <ActionPanel>
          <Action title="Send" icon={Icon.Message} onAction={sendMessage} />
          <Action title="Change ChatGPT Session Token" icon={Icon.Gear} onAction={() => openCommandPreferences()} />
        </ActionPanel>
      }
      isShowingDetail={!!Object.entries(messages).length}
    >
      {Object.entries(messages).length ? (
        Object.entries(messages)
          .reverse()
          .map(([messageId, message]) => (
            <List.Item
              key={messageId}
              id={messageId}
              title={message.sent}
              detail={
                <List.Item.Detail
                  markdown={`**You:**\n${message.sent}${
                    message.received ? `\n\n**ChatGPT:**\n${message.received}` : ""
                  }`}
                />
              }
              actions={
                <ActionPanel>
                  <Action title="Send" icon={Icon.Message} onAction={sendMessage} />
                  <Action title="Reset Conversation" icon={Icon.Repeat} onAction={resetConversation} />
                  <Action
                    title="Change ChatGPT Session Token"
                    icon={Icon.Gear}
                    onAction={() => openCommandPreferences()}
                  />
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
