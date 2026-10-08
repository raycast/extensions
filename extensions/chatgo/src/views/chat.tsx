import { ActionPanel, Icon, List, clearSearchBar } from "@raycast/api";
import { memo } from "react";
import { v4 as uuidv4 } from "uuid";
import { FormInputActionSection } from "../actions/form-input";
import { Chat, ChatViewProps, QuestionFormProps } from "../type";
import { EmptyView } from "./empty";
import { AnswerDetailView } from "./answer-detail";
import { DestructiveAction, PrimaryAction, TextToSpeechAction } from "../actions";
import { CopyActionSection } from "../actions/copy";
import { SaveActionSection } from "../actions/save";
import { PreferencesActionSection } from "../actions/preferences";
import { DEFAULT_TEMPLATE_MODE } from "../hooks/useMyTemplateModel";

export const ChatView = memo(
  ({
    data,
    question,
    conversation,
    setConversation,
    use,
    isAutoSaveConversation,
    templateModels,
    onTemplateModelChange,
    selectedTemplateModelId,
    onSubmit,
  }: ChatViewProps & { onSubmit: QuestionFormProps["onSubmit"] }) => {
    const sortedChats = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const getActionPanel = (selectedChat: Chat) => (
      <ActionPanel>
        {question.length > 0 ? (
          <PrimaryAction title="Get Answer" onAction={() => use.chats.ask(question, conversation.model)} />
        ) : selectedChat.answer && use.chats.selectedChatId === selectedChat.id ? (
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
          onSubmit={onSubmit}
          templateModels={templateModels}
          selectedTemplateModelId={selectedTemplateModelId}
          onTemplateModelChange={onTemplateModelChange}
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
                  model: DEFAULT_TEMPLATE_MODE,
                  pinned: false,
                  updated_at: "",
                  created_at: new Date().toISOString(),
                });
                use.chats.clear().then();
                clearSearchBar().then();
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
          const markdown = `**${sortedChat.question.trim()}**\n\n${sortedChat.answer}`;
          return (
            <List.Item
              id={sortedChat.id}
              key={sortedChat.id}
              accessories={[{ text: `#${use.chats.data.length - i}` }]}
              title={sortedChat.question}
              // icon={getAvatarIcon(sortedChat.question)}
              detail={sortedChat && <AnswerDetailView chat={sortedChat} markdown={markdown} />}
              actions={use.chats.isLoading ? undefined : getActionPanel(sortedChat)}
            />
          );
        })}
      </List.Section>
    );
  }
);
