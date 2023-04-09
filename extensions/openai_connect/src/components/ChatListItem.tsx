import { DestructiveAction } from "../actions/Destructive";
import { PrimaryAction } from "../actions/PrimaryAction";
import { CopyActionSection } from "../actions/copy";
import { PreferencesActionSection } from "../actions/preferences";
import { FormInputActionSection } from "../actions/questionform";
import { DEFAULT_MODEL_NAME } from "../hooks/useModel";
import { encode } from "../libs/encoder";
import { Chat } from "../types";
import { ChatListItemProps } from "../types";
import { AnswerDetailView } from "./AnswerDeatail";
import {
  ActionPanel,
  getPreferenceValues,
  List,
  showToast,
  useNavigation,
  Toast,
  clearSearchBar,
  Action,
} from "@raycast/api";
import { FC } from "react";
import { useState } from "react";
import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

export const ChatListItem: FC<ChatListItemProps> = ({
  chats,
  question,
  models,
  isInvalid,
  setConversation,
  conversation,
}) => {
  const [sortedChat, setSortedChat] = useState<Chat[]>([]);
  const [isHideMeta, setIsHideMeta] = useState<boolean>(true);
  useEffect(() => {
    const sorted = chats.data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setSortedChat(sorted);
  }, [chats.data]);
  const getActionPanel = (selectedChat: Chat) => (
    <ActionPanel>
      {question.length > 0 ? (
        <PrimaryAction
          title="Get Answer"
          onAction={() => {
            if (isInvalid) {
              showToast({
                title: "exceed max token",
                message: "Please enter a shorter question",
                style: Toast.Style.Failure,
              });
            } else {
              chats.ask(question, models.selectedModelName, conversation.id);
            }
          }}
        />
      ) : selectedChat.answer && chats.selectedChatId === selectedChat.id ? (
        <>
          <CopyActionSection answer={selectedChat.answer} question={selectedChat.question} />
          <Action
            title="Toggle Meta"
            onAction={() => setIsHideMeta(!isHideMeta)}
            shortcut={{ modifiers: ["ctrl"], key: "b" }}
          />
        </>
      ) : null}
      <FormInputActionSection question={question} chats={chats} models={models} conversation={conversation} />
      {chats.data.length > 0 && (
        <ActionPanel.Section title="Restart">
          <DestructiveAction
            title="Start New Conversation"
            dialog={{
              title: "Are you sure you want to start a new conversation?",
              primaryButton: "Start New",
            }}
            onAction={() => {
              setConversation({
                id: uuidv4(),
                chats: [],
                model: DEFAULT_MODEL_NAME,
                updated_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
              });
              chats.clear();
              clearSearchBar();
              chats.setLoading(false);
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          />
        </ActionPanel.Section>
      )}
      <PreferencesActionSection />
    </ActionPanel>
  );
  return (
    <List.Section title="Results" subtitle={chats.data.length.toLocaleString()}>
      {sortedChat.map((chat, i) => {
        // const markdown = `## ${chat.question}\n\n${chat.answer}`;
        return (
          <List.Item
            id={chat.id}
            key={chat.id}
            accessories={[{ text: `#${chats.data.length - i}` }]}
            title={chat.question || "No question"}
            detail={chat && <AnswerDetailView chat={chat} isHideMeta={isHideMeta} />}
            // detail={
            //   <List.Item.Detail markdown={}/>
            // }
            actions={chats.isLoading ? undefined : getActionPanel(chat)}
          />
        );
      })}
    </List.Section>
  );
};
