import { ActionPanel, clearSearchBar, getPreferenceValues, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { PrimaryAction } from "./actions";
import { FormInputActionSection } from "./actions/form-input";
import { PreferencesActionSection } from "./actions/preferences";
import { useAutoSaveConversation } from "./hooks/useAutoSaveConversation";
import { useChat } from "./hooks/useChat";
import { useConversations } from "./hooks/useConversations";
import { DEFAULT_MODEL, useModel } from "./hooks/useModel";
import { useQuestion } from "./hooks/useQuestion";
import { useSavedChat } from "./hooks/useSavedChat";
import { Chat, Conversation, Model } from "./type";
import { ChatView } from "./views/chat";
import { ModelDropdown } from "./views/model/dropdown";
import { QuestionForm } from "./views/question/form";

export default function Ask(props: { conversation?: Conversation; initialQuestion?: string }) {
  // Hooks
  const conversations = useConversations();
  const models = useModel();
  const savedChats = useSavedChat();
  const isAutoSaveConversation = useAutoSaveConversation();
  const chats = useChat<Chat>(props.conversation?.chats ?? []);
  const question = useQuestion({ initialQuestion: "", disableAutoLoad: !!props.conversation });
  const { push, pop } = useNavigation();

  // State
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
  const [selectedModelId, setSelectedModelId] = useState<string>(props.conversation?.model.id ?? "grok-3");
  const [isLoading, setLoading] = useState<boolean>(true);

  // Preferences
  const [{ isAutoFullInput, isAutoLoadText }] = useState(() => {
    return getPreferenceValues<{
      isAutoFullInput: boolean;
      isAutoLoadText: boolean;
    }>();
  });

  // Initial question handling
  useEffect(() => {
    if (props.initialQuestion) {
      chats.ask(props.initialQuestion, conversation.model);
    }
  }, [props.initialQuestion, conversation.model]);

  // Conversation and model management
  useEffect(() => {
    if (models.isLoading) return;

    // Update conversation with latest chats
    setConversation((prev) => ({
      ...prev,
      chats: chats.data,
      updated_at: new Date().toISOString(),
    }));

    // Handle initial model setup
    if (models.data && conversation.chats.length === 0) {
      const defaultUserModel = models.data["grok-3"] ?? conversation.model;
      setConversation((prev) => ({
        ...prev,
        model: defaultUserModel,
        updated_at: new Date().toISOString(),
      }));
    }

    // Handle model selection
    const selectedModel = models.data[selectedModelId];
    if (selectedModel) {
      setConversation((prev) => ({
        ...prev,
        model: selectedModel,
        updated_at: new Date().toISOString(),
      }));
    }

    // Auto-save conversation
    if ((props.conversation?.id !== conversation.id || conversations.data.length === 0) && isAutoSaveConversation) {
      conversations.add(conversation);
    }

    // Update conversation in storage
    conversations.update(conversation);

    // Handle question form
    if (!props.initialQuestion && isAutoFullInput && !isAutoLoadText && question.data.length > 0) {
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
    }

    setLoading(false);
  }, [models.isLoading, models.data, chats.data, selectedModelId, question.data]);

  const getActionPanel = (question: string, model: Model) => (
    <ActionPanel>
      <PrimaryAction title="Get Answer" onAction={() => chats.ask(question, model)} />
      <FormInputActionSection
        initialQuestion={question}
        onSubmit={(question) => chats.ask(question, model)}
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
      isLoading={isLoading || question.isLoading || chats.isLoading || models.isLoading}
      onSearchTextChange={question.update}
      throttle={false}
      navigationTitle={"Ask Grok"}
      actions={
        !question.data ? (
          <ActionPanel>
            <FormInputActionSection
              initialQuestion={question.data}
              onSubmit={(question) => chats.ask(question, conversation.model)}
              models={Object.values(models.data)}
              selectedModel={selectedModelId}
              onModelChange={setSelectedModelId}
            />
            <PreferencesActionSection />
          </ActionPanel>
        ) : (
          getActionPanel(question.data, conversation.model)
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
