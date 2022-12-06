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
import fetch from "node-fetch";

type Preferences = {
  OpenAIAPIKey: string;
};

type Message = {
  sent: string;
  received?: string;
  receivedId?: string;
};

export default function Command() {
  const { OpenAIAPIKey } = getPreferenceValues<Preferences>();

  const [messageValue, setMessageValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useCachedState<Record<string, Message>>("messages", {});
  const [conversationId, setConversationId] = useState<string | null>();
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();

  const sendMessage = async () => {
    setIsLoading(true);
    const messageId = crypto.randomUUID();
    const allMessages = Object.entries(messages);
    const previousMessageId = allMessages.length
      ? allMessages[allMessages.length - 1][1].receivedId
      : crypto.randomUUID();

    setMessages({
      [messageId]: {
        sent: messageValue,
      },
      ...messages,
    });
    setMessageValue("");
    setSelectedItemId(messageId);

    const response = await fetch("https://chat.openai.com/backend-api/conversation", {
      method: "POST",
      headers: {
        authorization: `Bearer ${OpenAIAPIKey}`,
        "content-type": "application/json",
      },
      referrer: "https://chat.openai.com/chat",
      referrerPolicy: "strict-origin-when-cross-origin",
      body: JSON.stringify({
        action: "next",
        messages: [
          {
            id: messageId,
            role: "user",
            content: { content_type: "text", parts: [messageValue] },
          },
        ],
        ...(conversationId ? { conversation_id: conversationId } : {}),
        parent_message_id: previousMessageId,
        model: "text-davinci-002-render",
      }),
    });

    if (response.body === null) {
      setIsLoading(false);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Something went wrong while making requests to OpenAI API",
      });

      return;
    }

    for await (const chunk of response.body) {
      try {
        const chunkData = JSON.parse(chunk.toString().replace("data: ", ""));
        if (chunkData?.detail?.code === "token_expired") {
          showToast({
            style: Toast.Style.Failure,
            title: "API Key expired",
            message: "Please update the OpenAI API Key in the extension preferences",
          });
        } else if (chunkData?.detail) {
          showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: chunkData.detail.message || chunkData.detail,
          });
        }

        if (!conversationId) {
          setConversationId(chunkData.conversation_id);
        }

        setMessages((previousMessages) => ({
          [messageId]: {
            ...previousMessages[messageId],
            received: chunkData.message.content.parts[0],
            receivedId: chunkData.message.id,
          },
          ...previousMessages,
        }));
        // Swallowing JSON.parse errors when streamed JSON is incomplete
        // eslint-disable-next-line no-empty
      } catch (error) {}
    }
    setIsLoading(false);
  };

  const resetConversation = () => {
    setConversationId(null);
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
      isShowingDetail={true}
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
