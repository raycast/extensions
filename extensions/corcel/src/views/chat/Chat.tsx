import { useCallback, useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Icon, List, getPreferenceValues, environment } from "@raycast/api";

import {
  type Chat,
  Exchange,
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
  model: Model;
  updateExchange: (exchange: Exchange) => void;
  deleteExchange: (exchange: Exchange) => void;
}> = ({ exchange, handleSendMessage, setIsLoading, exchanges, model, updateExchange, deleteExchange }) => {
  const [internalExchange, setInternalExchange] = useState(exchange);
  const internalExchangeRef = useRef(internalExchange);

  const { streamMessage, systemResponse, errorMessage, isStreaming, cancelStream } = useSendLastMessage(exchanges);

  const updateChatExchange = useCallback(() => {
    updateExchange(internalExchangeRef.current);
  }, []);

  useEffect(() => {
    if (!internalExchange.answer) {
      setIsLoading(true);
      streamMessage(model)
        .then(() => {
          setIsLoading(false);
          updateChatExchange();
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
      setInternalExchange((internalExchange) => {
        const newExchange = {
          ...internalExchange,
          answer: { content: systemResponse, updated_on: new Date().toUTCString() },
        };
        internalExchangeRef.current = { ...newExchange };
        return newExchange;
      });
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
          {environment.commandName !== "chats" && (
            <ActionPanel.Section title="Navigation">
              <OpenChatHistoryCommandAction />
            </ActionPanel.Section>
          )}

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
                deleteExchange(internalExchange);
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
        const exchanges = [generateExchangeFromQuestion(chatText, model), ...internalChat.exchanges];
        setInternalChat({ ...internalChat, title: exchanges[exchanges.length - 1].question.content, exchanges });
      } else {
        const newChat = generateChatFromQuestion(chatText, model);
        setInternalChat(newChat);
      }

      setChatText("");
    }
  }, [internalChat, chatText, setInternalChat, internalIsLoading]);

  const updateExchange = useCallback(
    (exchange: Exchange) => {
      if (internalChat) {
        const withoutExchangeToRemove = internalChat.exchanges.filter((exchng) => exchange.id !== exchng.id);
        setInternalChat({
          ...internalChat,
          exchanges: [exchange, ...withoutExchangeToRemove],
        });
      }
    },
    [internalChat, setInternalChat],
  );

  const deleteExchange = useCallback(
    (exchange: Exchange) => {
      if (internalChat) {
        const withoutExchangeToRemove = internalChat.exchanges.filter((exchng) => exchange.id !== exchng.id);
        setInternalChat({
          ...internalChat,
          exchanges: withoutExchangeToRemove,
        });
      }
    },
    [internalChat, setInternalChat],
  );

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
      isShowingDetail={!!internalChat && internalChat.exchanges.length > 0}
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
          {environment.commandName !== "chats" && (
            <ActionPanel.Section title="Navigation">
              <OpenChatHistoryCommandAction />
            </ActionPanel.Section>
          )}
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
              key={exchange.id}
              exchanges={internalChat.exchanges}
              exchange={exchange}
              handleSendMessage={addNewExchange}
              setIsLoading={setInternalIsLoading}
              updateExchange={updateExchange}
              deleteExchange={deleteExchange}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
};

export default Chat;
