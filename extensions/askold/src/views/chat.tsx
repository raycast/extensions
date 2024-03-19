import { ActionPanel, clearSearchBar, Icon, List } from "@raycast/api";
import { PrimaryAction, TextToSpeechAction } from "../actions";
import { CopyActionSection } from "../actions/copy";
import { FormInputActionSection } from "../actions/form-input";
import { PreferencesActionSection } from "../actions/preferences";
import { Chat, ChatViewProps } from "../type";
import { AnswerDetailView } from "./answer-detail";
import { EmptyView } from "./empty";

export const ChatView = ({
  data,
  question,
  conversation,
  use,
  prompts,
  selectedPrompt,
  onPromptChange,
}: ChatViewProps) => {
  const sortedChats = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const getActionPanel = (selectedChat: Chat) => (
    <ActionPanel>
      {question.length > 0 ? (
        <PrimaryAction title="Get Answer" onAction={() => use.chats.ask(question, conversation.prompt)} />
      ) : selectedChat.answer && use.chats.selectedChatId === selectedChat.id ? (
        <>
          <CopyActionSection answer={selectedChat.answer} question={selectedChat.question} />
          <ActionPanel.Section title="Output">
            <TextToSpeechAction content={selectedChat.answer} />
          </ActionPanel.Section>
        </>
      ) : null}
      <FormInputActionSection
        initialQuestion={question}
        onSubmit={(question) => use.chats.ask(question, conversation.prompt)}
        prompts={prompts}
        selectedPrompt={selectedPrompt}
        onPromptChange={onPromptChange}
      />
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
