import { ActionPanel, clearSearchBar, getPreferenceValues, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { PrimaryAction } from "./actions";
import { FormInputActionSection } from "./actions/form-input";
import { PreferencesActionSection } from "./actions/preferences";
import { useAutoSaveConversation } from "./hooks/useAutoSaveConversation";
import { useEnhancedChat } from "./hooks/useEnhancedChat";
import { useConversations } from "./hooks/useConversations";
import { DEFAULT_MODEL, useModel } from "./hooks/useModel";
import { useQuestion } from "./hooks/useQuestion";
import { useSavedChat } from "./hooks/useSavedChat";
import { Chat, Conversation } from "./type";
import { ChatView } from "./views/chat";
import { ModelDropdown } from "./views/model/dropdown";
import { QuestionForm } from "./views/question/form";

export default function Ask(props: { conversation?: Conversation; initialQuestion?: string }) {
  const conversations = useConversations();
  const models = useModel();
  const savedChats = useSavedChat();
  const isAutoSaveConversation = useAutoSaveConversation();
  const chats = useEnhancedChat<Chat>(props.conversation ? props.conversation.chats : []);
  const question = useQuestion({ initialQuestion: "", disableAutoLoad: !!props.conversation });
  const { push, pop } = useNavigation();

  const [{ isAutoFullInput, isAutoLoadText }] = useState(() => {
    return getPreferenceValues<{
      isAutoFullInput: boolean;
      isAutoLoadText: boolean;
    }>();
  });

  const [conversation, setConversation] = useState<Conversation>(
    props.conversation ?? {
      id: uuidv4(),
      chats: [],
      model: DEFAULT_MODEL,
      pinned: false,
      updated_at: "",
      created_at: new Date().toISOString(),
    },
  );

  const [selectedModelId, setSelectedModelId] = useState<string>(
    props.conversation ? props.conversation.model.id : "grok-3",
  );

  // Handle initial question and conversation setup
  useEffect(() => {
    if (props.initialQuestion && conversation) {
      chats.ask(props.initialQuestion, conversation.model);
    }
  }, [conversation]);

  // Handle model selection and conversation updates
  useEffect(() => {
    if (models.isLoading) return;

    const selectedModel = models.data[selectedModelId];
    const updatedConversation = {
      ...conversation,
      model: selectedModel ?? conversation.model,
      chats: chats.data,
      updated_at: new Date().toISOString(),
    };

    setConversation(updatedConversation);

    if (isAutoSaveConversation && (props.conversation?.id !== conversation.id || conversations.data.length === 0)) {
      conversations.add(updatedConversation);
    } else {
      conversations.update(updatedConversation);
    }
  }, [selectedModelId, models.data, chats.data]);

  // Handle auto-full input and question form
  useEffect(() => {
    if (models.isLoading) return;
    if (props.initialQuestion || !isAutoFullInput) return;
    if (isAutoLoadText && question.data.length === 0) return;
    if (conversation.chats.length === 0 || (conversation.chats.length > 0 && question.data.length > 0)) {
      const questionText = question.data;
      clearSearchBar();
      push(
        <QuestionForm
          initialQuestion={questionText}
          onSubmit={(question) => {
            chats.ask(question, conversation.model);
            pop();
          }}
          models={Object.values(models.data)}
          selectedModel={selectedModelId}
          onModelChange={setSelectedModelId}
          isFirstCall={conversation.chats.length === 0}
        />,
      );
    }
  }, [models.isLoading, models.data, question.data, conversation.model]);

  const getActionPanel = (question: string) => (
    <ActionPanel>
      <PrimaryAction
        title="Get Answer"
        onAction={() => {
          const currentModel = models.data[selectedModelId];
          chats.ask(question, currentModel);
        }}
      />
      <FormInputActionSection
        initialQuestion={question}
        onSubmit={(question) => {
          const currentModel = models.data[selectedModelId];
          chats.ask(question, currentModel);
        }}
        models={Object.values(models.data)}
        selectedModel={selectedModelId}
        onModelChange={setSelectedModelId}
      />
      <PreferencesActionSection />
    </ActionPanel>
  );

  return (
    <List
      searchText={question.data}
      isShowingDetail={chats.data.length > 0}
      filtering={false}
      isLoading={models.isLoading || question.isLoading || chats.isLoading}
      onSearchTextChange={question.update}
      throttle={false}
      navigationTitle={"Ask Grok"}
      actions={
        !question.data ? (
          <ActionPanel>
            <FormInputActionSection
              initialQuestion={question.data}
              onSubmit={(question) => {
                const currentModel = models.data[selectedModelId];
                chats.ask(question, currentModel);
              }}
              models={Object.values(models.data)}
              selectedModel={selectedModelId}
              onModelChange={setSelectedModelId}
            />
            <PreferencesActionSection />
          </ActionPanel>
        ) : (
          getActionPanel(question.data)
        )
      }
      selectedItemId={chats.selectedChatId || undefined}
      searchBarAccessory={
        <ModelDropdown
          models={Object.values(models.data)}
          onModelChange={setSelectedModelId}
          selectedModel={selectedModelId}
        />
      }
      searchBarPlaceholder={chats.data.length > 0 ? "Ask Grok another question..." : "Ask Grok a question..."}
    >
      <ChatView
        data={chats.data}
        question={question.data}
        isAutoSaveConversation={isAutoSaveConversation}
        setConversation={setConversation}
        use={{ chats, conversations, savedChats }}
        conversation={conversation}
        models={Object.values(models.data)}
        selectedModel={selectedModelId}
        onModelChange={setSelectedModelId}
      />
    </List>
  );
}
