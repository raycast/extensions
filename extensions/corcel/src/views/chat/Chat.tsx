import { useCallback, useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";

import {
  type Chat,
  Exchange,
  addOrUpdateExchange,
  deleteExchangeFromChatStorage,
  generateChatFromQuestion,
  generateExchangeFromQuestion,
  addOrUpdateChatInStorage,
  Model,
  CHAT_MODEL_TO_NAME_MAP,
  formatExchangeResponse,
} from "../../lib/chat";
import { utcTimeAgo } from "../../lib/time";
import { useSendLastMessage } from "../../hooks";
import { TOMATO } from "../../lib/colors";
import { SendMessageAction, OpenChatHistoryCommandAction } from "../../actions";

const models: { name: string; value: Model }[] = [
  { name: CHAT_MODEL_TO_NAME_MAP["cortext-ultra"], value: "cortext-ultra" },
  { name: CHAT_MODEL_TO_NAME_MAP["mixtral-8x7b"], value: "mixtral-8x7b" },
];

const ListItem: React.FC<{
  exchanges: Exchange[];
  exchange: Exchange;
  handleSendMessage: () => void;
  setIsLoading: (isLoading: boolean) => void;
  chat: Chat;
  model: Model;
}> = ({ exchange, handleSendMessage, setIsLoading, exchanges, chat, model }) => {
  const [internalExchange, setInternalExchange] = useState(exchange);
  const internalExchangeRef = useRef(internalExchange);

  const { streamMessage, systemResponse, errorMessage, isStreaming, cancelStream } = useSendLastMessage(exchanges);

  const updateChatExchange = useCallback(() => {
    addOrUpdateExchange(internalExchangeRef.current, chat.id);
  }, []);

  useEffect(() => {
    internalExchangeRef.current = internalExchange;
    if (!internalExchange.answer) {
      setIsLoading(true);
      streamMessage(model)
        .then(() => {
          setIsLoading(false);
          updateChatExchange(); // Save to store
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  }, [internalExchange]);

  useEffect(() => {
    return () => {
      cancelStream();
    };
  }, []);

  useEffect(() => {
    if (systemResponse) {
      setInternalExchange((internalExchange) => ({
        ...internalExchange,
        answer: { content: systemResponse, updated_on: new Date().toUTCString() },
      }));
    }
  }, [systemResponse]);

  return (
    <List.Item
      id={internalExchange.id}
      title={internalExchange.question.content}
      icon={Icon.Message}
      accessories={[{ text: utcTimeAgo(internalExchange.created_on) }]}
      detail={<List.Item.Detail markdown={formatExchangeResponse(internalExchange, isStreaming, errorMessage)} />}
      key={internalExchange.id}
      subtitle={errorMessage ? `Error: ${errorMessage}` : ""}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Input">
            <SendMessageAction handleSendMessageAction={handleSendMessage} />
            {isStreaming && (
              <Action
                title="Cancel"
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                icon={{ source: Icon.Xmark, tintColor: TOMATO }}
                onAction={() => {
                  cancelStream();
                }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Navigation">
            <OpenChatHistoryCommandAction />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Question" content={internalExchange.question.content} />
            {internalExchange.answer && (
              <Action.CopyToClipboard title="Copy Answer" content={internalExchange.answer.content} />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Delete">
            <Action
              title="Delete Message"
              icon={Icon.Trash}
              onAction={() => {
                deleteExchangeFromChatStorage(internalExchange.id, chat.id);
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

const Chat: React.FC<{ chat?: Chat; isLoading?: boolean }> = ({ chat, isLoading }) => {
  const preferences = getPreferenceValues<Preferences>();
  const [internalChat, setInternalChat] = useState(chat);
  const [chatText, setChatText] = useState("");
  const [internalIsLoading, setInternalIsLoading] = useState(!!isLoading);
  const [model, setModel] = useState<Model>(preferences.chatModel);

  const addNewExchange = useCallback(() => {
    if (!internalIsLoading) {
      if (internalChat) {
        const exchange = generateExchangeFromQuestion(chatText, model);
        setInternalChat({ ...internalChat, exchanges: [exchange, ...internalChat.exchanges] });
      } else {
        const newChat = generateChatFromQuestion(chatText, model);
        setInternalChat(newChat);
      }

      setChatText("");
    }
  }, [internalChat, chatText, setInternalChat, internalIsLoading]);

  const onSearchTextChange = useCallback(
    (value: string) => {
      if (!internalIsLoading) {
        setChatText(value);
      }
    },
    [internalIsLoading, setChatText],
  );

  useEffect(() => {
    setInternalIsLoading(!!isLoading);
  }, [isLoading]);

  useEffect(() => {
    setInternalChat(chat);
  }, [chat]);

  useEffect(() => {
    if (internalChat) {
      addOrUpdateChatInStorage(internalChat);
    }
  }, [internalChat]);

  return (
    <List
      searchBarPlaceholder={chat && chat.exchanges.length > 0 ? "Continue conversation..." : "Send a message..."}
      searchText={chatText}
      filtering={false}
      isLoading={internalIsLoading}
      isShowingDetail={!!internalChat}
      onSearchTextChange={onSearchTextChange}
      searchBarAccessory={
        <List.Dropdown
          value={model}
          tooltip="Select a Model"
          onChange={(newValue) => {
            setModel(newValue as Model);
          }}
        >
          <List.Dropdown.Section title="Models">
            {models.map((model) => (
              <List.Dropdown.Item key={model.value} title={model.name} value={model.value} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Input">
            <SendMessageAction handleSendMessageAction={addNewExchange} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Navigation">
            <OpenChatHistoryCommandAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {!internalChat || internalChat.exchanges.length === 0 ? (
        <List.EmptyView icon={{ source: "icon-chat-bubble.svg" }} title="Type something to start chatting." />
      ) : (
        <List.Section>
          {internalChat.exchanges.map((exchange) => (
            <ListItem
              model={model}
              chat={internalChat}
              key={exchange.id}
              exchanges={internalChat.exchanges}
              exchange={exchange}
              handleSendMessage={addNewExchange}
              setIsLoading={setInternalIsLoading}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
};

export default Chat;
