import { ActionPanel, getPreferenceValues, List, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
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
import { EditModelAction } from "./actions/edit-model";
import { CacheAdapter } from "./utils/cache";
import { initialModelId, selectedChatModel } from "./utils/model-selection";

export default function Ask(props: { conversation?: Conversation; initialQuestion?: string; initialModel?: Model }) {
  const conversations = useConversations();
  const models = useModel();
  const savedChats = useSavedChat();
  const isAutoSaveConversation = useAutoSaveConversation();
  const chats = useChat<Chat>(props.conversation ? props.conversation.chats : []);
  const question = useQuestion({ initialQuestion: "", disableAutoLoad: !!props.conversation });

  useEffect(() => {
    // only work on `Summarize -> Ask` flow
    if (props.initialQuestion) {
      chats.ask(props.initialQuestion, [], props.conversation!.model);
    }
  }, []);

  const explicitModel = props.initialModel ?? props.conversation?.model;
  const [modelCache] = useState(() => new CacheAdapter("select_model"));
  const rememberInitialModel = useRef(!!props.initialModel);
  const [conversation, setConversation] = useState<Conversation>(
    props.conversation ?? {
      id: uuidv4(),
      chats: [],
      model: explicitModel ?? DEFAULT_MODEL,
      pinned: false,
      updated_at: "",
      created_at: new Date().toISOString(),
    },
  );

  const [selectedModelId, setSelectedModelId] = useState<string>(() => initialModelId(explicitModel, modelCache.get()));

  const [{ isAutoFullInput, isAutoLoadText }] = useState(() => {
    return getPreferenceValues<{
      isAutoFullInput: boolean;
      isAutoLoadText: boolean;
    }>();
  });

  const { push } = useNavigation();
  const openedInitialInput = useRef(false);
  const currentModel = selectedChatModel(models.data, selectedModelId, explicitModel ?? conversation.model);
  const currentModelId = useRef(currentModel.id);
  currentModelId.current = currentModel.id;
  const changeModel = (id: string) => {
    if (id === currentModelId.current) return;
    currentModelId.current = id;
    setSelectedModelId(id);
    modelCache.set(id);
  };
  const availableModels = models.data[currentModel.id]
    ? Object.values(models.data)
    : [...Object.values(models.data), currentModel];
  const submitQuestion = (text: string, files: string[], model = currentModel) => {
    void question.update("");
    return chats.ask(text, files, model);
  };

  useEffect(() => {
    if (models.isLoading || question.isLoading || openedInitialInput.current) return;
    openedInitialInput.current = true;
    if (props.initialQuestion || !isAutoFullInput) return;
    if (isAutoLoadText && question.data.length === 0) return;
    if (conversation.chats.length === 0 || question.data.length > 0) {
      push(
        <QuestionForm
          initialQuestion={question.data}
          onSubmit={submitQuestion}
          models={availableModels}
          selectedModel={currentModel.id}
          onModelChange={changeModel}
          isFirstCall={conversation.chats.length === 0}
        />,
      );
    }
  }, [models.isLoading, question.isLoading, question.data, currentModel]);

  useEffect(() => {
    if ((props.conversation?.id !== conversation.id || conversations.data.length === 0) && isAutoSaveConversation) {
      conversations.add(conversation);
    }
  }, []);

  useEffect(() => {
    conversations.update(conversation);
  }, [conversation]);

  useEffect(() => {
    setConversation((previous) => ({ ...previous, chats: chats.data, updated_at: new Date().toISOString() }));
  }, [chats.data]);

  useEffect(() => {
    if (models.isLoading) return;
    setSelectedModelId(currentModel.id);
    // Models -> Ask is an explicit choice. Continuing a conversation is session-local.
    if (rememberInitialModel.current) {
      modelCache.set(currentModel.id);
      rememberInitialModel.current = false;
    }
    setConversation((previous) => ({ ...previous, model: currentModel, updated_at: new Date().toISOString() }));
  }, [currentModel, models.isLoading]);

  const getActionPanel = (question: string, model: Model) => (
    <ActionPanel>
      <PrimaryAction title="Get Answer" onAction={() => submitQuestion(question, [], model)} />
      <FormInputActionSection
        initialQuestion={question}
        onSubmit={submitQuestion}
        models={availableModels}
        selectedModel={currentModel.id}
        onModelChange={changeModel}
      />
      <EditModelAction modelId={currentModel.id} />
      <PreferencesActionSection />
    </ActionPanel>
  );

  if (models.isLoading)
    return <List isLoading navigationTitle="Ask" searchText={question.data} onSearchTextChange={question.update} />;

  return (
    <List
      searchText={question.data}
      isShowingDetail={chats.data.length > 0}
      filtering={false}
      isLoading={question.isLoading || chats.isLoading || models.isLoading}
      onSearchTextChange={question.update}
      throttle={false}
      navigationTitle={"Ask"}
      actions={
        !question.data ? (
          <ActionPanel>
            <FormInputActionSection
              initialQuestion={question.data}
              onSubmit={submitQuestion}
              models={availableModels}
              selectedModel={currentModel.id}
              onModelChange={changeModel}
            />
            <EditModelAction modelId={currentModel.id} />
            <PreferencesActionSection />
          </ActionPanel>
        ) : (
          getActionPanel(question.data, currentModel)
        )
      }
      selectedItemId={chats.selectedChatId || undefined}
      searchBarAccessory={
        <ModelDropdown models={availableModels} onModelChange={changeModel} selectedModel={currentModel.id} />
      }
      // https://github.com/raycast/extensions/issues/10844
      // `onSelectionChange` may cause race condition
      searchBarPlaceholder={chats.data.length > 0 ? "Ask another question..." : "Ask a question..."}
    >
      <ChatView
        data={chats.data}
        question={question.data}
        isAutoSaveConversation={isAutoSaveConversation}
        setConversation={setConversation}
        use={{ chats: { ...chats, ask: submitQuestion }, conversations, savedChats }}
        conversation={{ ...conversation, model: currentModel }}
        models={availableModels}
        selectedModel={currentModel.id}
        onModelChange={changeModel}
      />
    </List>
  );
}
