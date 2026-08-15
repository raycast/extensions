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
          models={Object.values(models.data)}
          selectedModel={selectedModelId}
          onModelChange={setSelectedModelId}
          isFirstCall={conversation.chats.length === 0}
        />,
      );
    }

    setLoading(false);
  }, [models.isLoading, models.data, question.data, conversation.model]);

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
    if (models.data && conversation.chats.length === 0) {
      const defaultUserModel = models.data[DEFAULT_MODEL.id] ?? conversation.model;
      setConversation({ ...conversation, model: defaultUserModel, updated_at: new Date().toISOString() });
    }
  }, [models.isLoading, models.data]);

  useEffect(() => {
    const updatedConversation = { ...conversation, chats: chats.data, updated_at: new Date().toISOString() };
    setConversation(updatedConversation);
  }, [chats.data]);

  useEffect(() => {
    if (models.isLoading) {
      return;
    }
    // as long as this side effect under the bottom stack, we should stick `state` in this position
    setIsConversationDone(false);
    const selectedModel = models.data[selectedModelId];
    // console.debug("selectedModel: ", selectedModelId, selectedModel?.option);
    setConversation({
      ...conversation,
      model: selectedModel ?? { ...conversation.model },
      updated_at: new Date().toISOString(),
    });
    setIsConversationDone(true);
  }, [selectedModelId, models.isLoading, models.data]);

  const getActionPanel = (question: string, model: Model) => (
    <ActionPanel>
      <PrimaryAction title="Get Answer" onAction={() => chats.ask(question, [], model)} />
      <FormInputActionSection
        initialQuestion={question}
        onSubmit={(question, files) => chats.ask(question, files, model)}
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
      navigationTitle={"Ask"}
      actions={
        !question.data ? (
          <ActionPanel>
            <FormInputActionSection
              initialQuestion={question.data}
              onSubmit={(question, files) => chats.ask(question, files, conversation.model)}
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
        models={Object.values(models.data)}
        selectedModel={selectedModelId}
        onModelChange={setSelectedModelId}
      />
    </List>
  );
}
