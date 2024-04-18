import { useCallback, useState } from "react";
import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";

import { useChats } from "../hooks";
import { ChatId, generateChatFromQuestion, putNewChatInStorage } from "../lib/chat";

import ChatTemplate from "./chat/ChatTemplate";

const Chats: React.FC<{ onListItemSelect: (chatId: ChatId) => void }> = ({ onListItemSelect }) => {
  const { chats, isLoading, deleteChat, fetchChatsFromLocalStorage } = useChats();
  const [chatText, setChatText] = useState("");
  const navigation = useNavigation();

  const createNewChatActionHandler = useCallback(() => {
    const newChat = generateChatFromQuestion(chatText);
    putNewChatInStorage(newChat).then(() => {
      fetchChatsFromLocalStorage();
      navigation.push(<ChatTemplate chat={newChat} isLoading={false} />);
    });

    setChatText("");
  }, [chatText]);

  const hasNoChatHistory = chats.length === 0;

  return (
    <List
      searchText={chatText}
      isLoading={isLoading}
      filtering={!hasNoChatHistory}
      searchBarPlaceholder={hasNoChatHistory ? "Send a message to Corcel" : "Search through your chats"}
      onSearchTextChange={setChatText}
      actions={
        <ActionPanel>
          {hasNoChatHistory && (
            <ActionPanel.Section title="Input">
              <Action
                title="Send a Message"
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                icon={Icon.Text}
                onAction={() => {
                  createNewChatActionHandler();
                }}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    >
      <List.EmptyView title="No chats found. Type in something to Chat with Corcel" />
      <List.Section subtitle={chats.length.toString()}>
        {chats.map((chat) => (
          <List.Item
            key={chat.id}
            title={chat.title}
            accessories={[
              {
                tag: chat.model,
              },
              {
                text: `${new Date(chat.created_on).toLocaleDateString()} ${new Date(chat.created_on).getUTCHours()}:${new Date(chat.created_on).getMinutes()}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action title="Select" onAction={() => onListItemSelect(chat.id)}></Action>
                <Action title="Delete" onAction={() => deleteChat(chat.id)}></Action>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
};

export default Chats;
