import { ActionPanel, clearSearchBar, Icon, List } from "@raycast/api";
import { v4 as uuidv4 } from "uuid";
import { DestructiveAction, PrimaryAction, TextToSpeechAction } from "../actions";
import { CopyActionSection } from "../actions/copy";
import { FormInputActionSection } from "../actions/form-input";
import { PreferencesActionSection } from "../actions/preferences";
import { SaveActionSection } from "../actions/save";
import { Chat, ChatViewProps } from "../type";
import { AnswerDetailView } from "./answer-detail";
import { EmptyView } from "./empty";

export const ChatView = ({
  data,
  question,
  conversation,
  setConversation,
  use,
  models,
  selectedModel,
  isAutoSaveConversation,
  onModelChange,
}: ChatViewProps) => {
  const sortedChats = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const getActionPanel = (selectedChat: Chat) => (
    <ActionPanel>
      {question.length > 0 ? (
        <PrimaryAction title="Get Answer" onAction={() => use.chats.ask(question, [], conversation.model)} />
      ) : selectedChat.answer ? (
        <>
          <CopyActionSection answer={selectedChat.answer} question={selectedChat.question} />
          <SaveActionSection
            onSaveAnswerAction={() => use.savedChats.add(selectedChat)}
            onSaveConversationAction={
              isAutoSaveConversation
                ? undefined
                : use.conversations.data.find((x) => x.id === conversation.id)
                  ? undefined
                  : () => use.conversations.add(conversation)
            }
          />
          <ActionPanel.Section title="Output">
            <TextToSpeechAction content={selectedChat.answer} />
          </ActionPanel.Section>
        </>
      ) : null}
      <FormInputActionSection
        initialQuestion={question}
        onSubmit={(question, files) => use.chats.ask(question, files, conversation.model)}
        models={models}
        selectedModel={selectedModel}
        onModelChange={onModelChange}
      />
      {use.chats.data.length > 0 && (
        <ActionPanel.Section title="Restart">
          <DestructiveAction
            title="Start New Conversation"
            icon={Icon.RotateAntiClockwise}
            dialog={{
              title: "Are you sure you want to start a new conversation?",
              primaryButton: "Start New",
            }}
            onAction={() => {
              setConversation({
                id: uuidv4(),
                chats: [],
                model: conversation.model,
                pinned: false,
                updated_at: "",
                created_at: new Date().toISOString(),
              });
              use.chats.clear();
              clearSearchBar();
              use.chats.setLoading(false);
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          />
        </ActionPanel.Section>
      )}
      <PreferencesActionSection />
    </ActionPanel>
  );

  return sortedChats.length === 0 ? (
    <EmptyView />
  ) : (
    <List.Section title="Results" subtitle={data.length.toLocaleString()}>
      {sortedChats.map((sortedChat, i) => {
        return (
          <List.Item
            id={sortedChat.id}
            key={sortedChat.id}
            accessories={[{ text: `#${use.chats.data.length - i}` }]}
            title={sortedChat.question}
            detail={sortedChat && <AnswerDetailView chat={sortedChat} streamData={use.chats.streamData} />}
            actions={use.chats.isLoading ? undefined : getActionPanel(sortedChat)}
          />
        );
      })}
    </List.Section>
  );
};
