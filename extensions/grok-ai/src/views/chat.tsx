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

const sortChatsByDate = (chats: Chat[]): Chat[] =>
  [...chats].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

const getChatActions = (selectedChat: Chat, props: ChatViewProps) => {
  const { question, conversation, use, models, selectedModel, onModelChange, isAutoSaveConversation, setConversation } =
    props;

  if (use.chats.isLoading) return undefined;

  const showAnswerActions = selectedChat.answer && use.chats.selectedChatId === selectedChat.id;
  const canSaveConversation = !isAutoSaveConversation && !use.conversations.data.find((x) => x.id === conversation.id);

  return (
    <ActionPanel>
      {question.length > 0 ? (
        <PrimaryAction
          title="Get Grok's Answer"
          onAction={() => {
            const currentModel = models.find((m) => m.id === selectedModel);
            if (currentModel) {
              use.chats.ask(question, currentModel);
            }
          }}
        />
      ) : showAnswerActions ? (
        <>
          <CopyActionSection answer={selectedChat.answer} question={selectedChat.question} />
          <SaveActionSection
            onSaveAnswerAction={() => use.savedChats.add(selectedChat)}
            onSaveConversationAction={canSaveConversation ? () => use.conversations.add(conversation) : undefined}
          />
          <ActionPanel.Section title="Output">
            <TextToSpeechAction content={selectedChat.answer} />
          </ActionPanel.Section>
        </>
      ) : null}

      <FormInputActionSection
        initialQuestion={question}
        onSubmit={(question) => {
          const currentModel = models.find((m) => m.id === selectedModel);
          if (currentModel) {
            use.chats.ask(question, currentModel);
          }
        }}
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
              title: "Are you sure you want to start a new conversation with Grok?",
              primaryButton: "Start New",
            }}
            onAction={() => {
              setConversation({
                id: uuidv4(),
                chats: [],
                model: conversation.model,
                pinned: false,
                updated_at: new Date().toISOString(),
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
};

export const ChatView = (props: ChatViewProps) => {
  const { data, use } = props;
  const sortedChats = sortChatsByDate(data);

  if (sortedChats.length === 0) {
    return <EmptyView />;
  }

  return (
    <List.Section title="Grok Results" subtitle={`${data.length} messages`}>
      {sortedChats.map((chat, i) => (
        <List.Item
          id={chat.id}
          key={chat.id}
          accessories={[{ text: `#${use.chats.data.length - i}` }]}
          title={chat.question}
          detail={<AnswerDetailView chat={chat} streamData={use.chats.streamData} />}
          actions={getChatActions(chat, props)}
        />
      ))}
    </List.Section>
  );
};
