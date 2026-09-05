import { ActionPanel, clearSearchBar, getPreferenceValues, List, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { AuthProvider, AuthStatus, getInitialAuthStatus, resolveAuthStatus } from "./utils/auth";
import { filterModelsForAuth, orderModelsForSelection, resolveModelOptionForAuth } from "./utils/model-support";
import { Chat, Conversation, Model } from "./type";
import { AuthRequiredView } from "./views/auth-required";
import { ChatView } from "./views/chat";
import { ModelDropdown } from "./views/model/dropdown";
import { QuestionForm } from "./views/question/form";

interface AskProps {
  conversation?: Conversation;
  initialQuestion?: string;
}

export default function Ask(props: AskProps) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>(() => getInitialAuthStatus());
  const [isAuthLoading, setAuthLoading] = useState<boolean>(() => !getInitialAuthStatus().hasApiKey);

  const refreshAuth = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setAuthLoading(true);
    }

    const status = await resolveAuthStatus();
    setAuthStatus(status);
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    refreshAuth(false);
  }, [refreshAuth]);

  if (isAuthLoading) {
    return <List isLoading={true} />;
  }

  if (authStatus.provider === "none") {
    return <AuthRequiredView onAuthChange={() => refreshAuth(true)} />;
  }

  return <AskContent {...props} authProvider={authStatus.provider} />;
}

function AskContent(props: AskProps & { authProvider: AuthProvider }) {
  const { authProvider } = props;
  const conversations = useConversations();
  const models = useModel();
  const savedChats = useSavedChat();
  const isAutoSaveConversation = useAutoSaveConversation();
  const chats = useChat<Chat>(props.conversation ? props.conversation.chats : [], props.conversation?.codexThreadId);
  const question = useQuestion({ initialQuestion: "", disableAutoLoad: !!props.conversation });

  const availableModels = useMemo(
    () => orderModelsForSelection(filterModelsForAuth(Object.values(models.data), authProvider, models.option)),
    [authProvider, models.data, models.option],
  );

  const availableModelsMap = useMemo(() => {
    return availableModels.reduce<Record<string, Model>>((acc, model) => {
      acc[model.id] = model;
      return acc;
    }, {});
  }, [availableModels]);

  const [conversation, setConversation] = useState<Conversation>(
    (() => {
      const initialConversation = props.conversation ?? {
        id: uuidv4(),
        chats: [],
        model: DEFAULT_MODEL,
        codexThreadId: null,
        pinned: false,
        updated_at: "",
        created_at: new Date().toISOString(),
      };

      const modelOption = resolveModelOptionForAuth(initialConversation.model.option, authProvider, models.option);
      if (modelOption === initialConversation.model.option) {
        return initialConversation;
      }

      return {
        ...initialConversation,
        model: {
          ...initialConversation.model,
          option: modelOption,
          updated_at: new Date().toISOString(),
        },
      };
    })(),
  );

  const [isLoading, setLoading] = useState<boolean>(true);

  const [selectedModelId, setSelectedModelId] = useState<string>(
    props.conversation ? props.conversation.model.id : "default",
  );

  const [{ isAutoFullInput, isAutoLoadText }] = useState(() => {
    return getPreferenceValues<{
      isAutoFullInput: boolean;
      isAutoLoadText: boolean;
    }>();
  });

  const { push, pop } = useNavigation();
  const [isConversationDone, setIsConversationDone] = useState(false);

  useEffect(() => {
    // only work on `Summarize -> Ask` flow
    if (props.initialQuestion) {
      chats.ask(props.initialQuestion, [], conversation.model);
    }
  }, []);

  useEffect(() => {
    if (models.isLoading || availableModels.length === 0) {
      return;
    }

    if (!availableModelsMap[selectedModelId]) {
      setSelectedModelId(getFallbackModelId(availableModels));
    }
  }, [models.isLoading, availableModels, availableModelsMap, selectedModelId]);

  useEffect(() => {
    // `QuestionForm` depend on models data and conversation data
    // Eventually fixed https://github.com/raycast/extensions/issues/11420
    if (models.isLoading || !isConversationDone) {
      return;
    }
    if (props.initialQuestion || !isAutoFullInput) {
      // `initialQuestion` only set from Summarize.tsx page
      // `isAutoFullInput` is set from preferences
      setLoading(false);
      return;
    }
    if (isAutoLoadText && question.data.length === 0) {
      setLoading(false);
      return;
    }
    if (conversation.chats.length === 0 || (conversation.chats.length > 0 && question.data.length > 0)) {
      const questionText = question.data;
      clearSearchBar();
      push(
        <QuestionForm
          initialQuestion={questionText}
          onSubmit={(question, files) => {
            // console.debug("onSubmit", question, files, conversation.model.option);
            chats.ask(question, files, conversation.model);
            pop();
          }}
          models={availableModels}
          selectedModel={selectedModelId}
          onModelChange={setSelectedModelId}
          isFirstCall={conversation.chats.length === 0}
        />,
      );
    }

    setLoading(false);
  }, [models.isLoading, availableModels, question.data, conversation.model]);

  useEffect(() => {
    if ((props.conversation?.id !== conversation.id || conversations.data.length === 0) && isAutoSaveConversation) {
      conversations.add(conversation);
    }
  }, []);

  useEffect(() => {
    conversations.update(conversation);
  }, [conversation]);

  useEffect(() => {
    if (models.isLoading) {
      return;
    }
    if (availableModels.length > 0 && conversation.chats.length === 0) {
      const defaultUserModel = availableModelsMap[DEFAULT_MODEL.id] ?? availableModels[0] ?? conversation.model;
      setConversation({ ...conversation, model: defaultUserModel, updated_at: new Date().toISOString() });
    }
  }, [models.isLoading, availableModels, availableModelsMap]);

  useEffect(() => {
    setConversation((previousConversation) => ({
      ...previousConversation,
      chats: chats.data,
      codexThreadId: chats.codexThreadId,
      updated_at: new Date().toISOString(),
    }));
  }, [chats.data, chats.codexThreadId]);

  useEffect(() => {
    if (models.isLoading) {
      return;
    }
    // as long as this side effect under the bottom stack, we should stick `state` in this position
    setIsConversationDone(false);
    const selectedModel = availableModelsMap[selectedModelId];
    // console.debug("selectedModel: ", selectedModelId, selectedModel?.option);
    setConversation({
      ...conversation,
      model: selectedModel ?? { ...conversation.model },
      updated_at: new Date().toISOString(),
    });
    setIsConversationDone(true);
  }, [selectedModelId, models.isLoading, availableModelsMap]);

  const getActionPanel = (question: string, model: Model) => (
    <ActionPanel>
      <PrimaryAction title="Get Answer" onAction={() => chats.ask(question, [], model)} />
      <FormInputActionSection
        initialQuestion={question}
        onSubmit={(question, files) => chats.ask(question, files, model)}
        models={availableModels}
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
      navigationTitle={"Ask"}
      actions={
        !question.data ? (
          <ActionPanel>
            <FormInputActionSection
              initialQuestion={question.data}
              onSubmit={(question, files) => chats.ask(question, files, conversation.model)}
              models={availableModels}
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
        <ModelDropdown models={availableModels} onModelChange={setSelectedModelId} selectedModel={selectedModelId} />
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
        use={{ chats, conversations, savedChats }}
        conversation={conversation}
        models={availableModels}
        selectedModel={selectedModelId}
        onModelChange={setSelectedModelId}
      />
    </List>
  );
}

function getFallbackModelId(models: Model[]): string {
  if (models.find((model) => model.id === "default")) {
    return "default";
  }

  return models[0]?.id ?? "default";
}
