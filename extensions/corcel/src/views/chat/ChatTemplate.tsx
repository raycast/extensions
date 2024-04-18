import { useCallback, useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";

import {
  Chat,
  Exchange,
  addOrUpdateExchange,
  deleteExchangeFromChatStorage,
  generateChatFromQuestion,
  generateExchangeFromQuestion,
  putNewChatInStorage,
} from "../../lib/chat";
import { utcTimeAgo } from "../../lib/time";
import { useSendLastMessage } from "../../hooks";

const ListItem: React.FC<{
  exchanges: Exchange[];
  exchange: Exchange;
  createNewExchangeActionHandler: () => void;
  setIsLoading: (isLoading: boolean) => void;
  chat: Chat;
}> = ({ exchange, createNewExchangeActionHandler, setIsLoading, exchanges, chat }) => {
  const [internalExchange, setInternalExchange] = useState(exchange);
  const internalExchangeRef = useRef(internalExchange);

  const { streamMessage, systemResponse, errorMessage } = useSendLastMessage(exchanges, chat.model);

  const updateChatExchange = useCallback(() => {
    addOrUpdateExchange(internalExchangeRef.current, chat.id);
  }, []);

  useEffect(() => {
    internalExchangeRef.current = internalExchange;
    if (!internalExchange.answer) {
      setIsLoading(true);
      streamMessage()
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
      accessories={[{ text: utcTimeAgo(internalExchange.created_on) }]}
      detail={
        <List.Item.Detail
          markdown={errorMessage ? `> ## Error: ${errorMessage}` : internalExchange.answer?.content || ""}
        />
      }
      key={internalExchange.id}
      subtitle={errorMessage ? `Error: ${errorMessage}` : ""}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Input">
            <Action
              title="Send a Message"
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              icon={Icon.Text}
              onAction={() => {
                createNewExchangeActionHandler();
              }}
            />
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

const ChatTemplate: React.FC<{ isLoading: boolean; chat?: Chat }> = ({ isLoading, chat }) => {
  const [internalChat, setInternalChat] = useState(chat);
  const [chatText, setChatText] = useState("");
  const [internalIsLoading, setInternalIsLoading] = useState(isLoading);

  useEffect(() => {
    setInternalChat(chat);
    setInternalIsLoading(isLoading);
  }, [isLoading, chat]);

  const addNewExchange = useCallback(
    (question: string) => {
      if (internalChat) {
        const exchange = generateExchangeFromQuestion(question);
        setInternalChat({ ...internalChat, exchanges: [exchange, ...internalChat.exchanges] });
      }
    },
    [internalChat, setInternalChat],
  );

  const createNewExchangeActionHandler = useCallback(() => {
    if (chat) {
      addNewExchange(chatText);
    } else {
      const newChat = generateChatFromQuestion(chatText);
      putNewChatInStorage(newChat);
      setInternalChat(newChat);
    }
    setChatText("");
  }, [addNewExchange, chatText]);

  return (
    <List
      searchBarPlaceholder="Send a message to Corcel"
      searchText={chatText}
      filtering={false}
      isLoading={internalIsLoading}
      isShowingDetail={!!internalChat}
      onSearchTextChange={setChatText}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Input">
            <Action
              title="Send a Message"
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              icon={Icon.Text}
              onAction={() => {
                createNewExchangeActionHandler();
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {!internalChat || internalChat.exchanges.length === 0 ? (
        <List.EmptyView
          icon={{ source: "icon-chat-bubble.svg" }}
          title="Type something to start chatting with Corcel."
        />
      ) : (
        <List.Section>
          {internalChat.exchanges.map((exchange) => (
            <ListItem
              chat={internalChat}
              key={exchange.id}
              exchanges={internalChat.exchanges}
              exchange={exchange}
              createNewExchangeActionHandler={createNewExchangeActionHandler}
              setIsLoading={setInternalIsLoading}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
};

export default ChatTemplate;
