import { ActionPanel, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { PrimaryAction } from "./actions";
import { FormInputActionSection } from "./actions/form-input";
import { PreferencesActionSection } from "./actions/preferences";
import { ApfelGuard } from "./components/ApfelGuard";
import { useChat } from "./hooks/useChat";
import { useConversations } from "./hooks/useConversations";
import { DEFAULT_MODEL, useModel } from "./hooks/useModel";
import { useQuestion } from "./hooks/useQuestion";
import type { Chat, Conversation, Model } from "./type";
import { ChatView } from "./views/chat";
import { ModelDropdown } from "./views/model/dropdown";

export default function Command(props: { conversation?: Conversation }) {
  return (
    <ApfelGuard>
      <Chat {...props} />
    </ApfelGuard>
  );
}

function Chat(props: { conversation?: Conversation }) {
  const conversations = useConversations();
  const models = useModel();

  const chats = useChat<Chat>(props.conversation ? props.conversation.chats : []);
  const question = useQuestion({ initialQuestion: "" });

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
    props.conversation ? props.conversation.model.id : "default",
  );

  useEffect(() => {
    if (props.conversation?.id !== conversation.id || conversations.data.length === 0) {
      conversations.add(conversation);
    }
  }, []);

  useEffect(() => {
    conversations.update(conversation);
  }, [conversation]);

  useEffect(() => {
    if (models.data && conversation.chats.length === 0) {
      const defaultUserModel = models.data.find((x) => x.id === DEFAULT_MODEL.id) ?? conversation.model;
      setConversation({ ...conversation, model: defaultUserModel, updated_at: new Date().toISOString() });
    }
  }, [models.data]);

  useEffect(() => {
    const updatedConversation = { ...conversation, chats: chats.data, updated_at: new Date().toISOString() };
    setConversation(updatedConversation);
  }, [chats.data]);

  useEffect(() => {
    const selectedModel = models.data.find((x) => x.id === selectedModelId);
    setConversation({
      ...conversation,
      model: selectedModel ?? { ...conversation.model },
      updated_at: new Date().toISOString(),
    });
  }, [selectedModelId]);

  const getActionPanel = (question: string, model: Model) => (
    <ActionPanel>
      <PrimaryAction title="Get Answer" onAction={() => chats.ask(question, model)} />
      <FormInputActionSection
        initialQuestion={question}
        onSubmit={(question) => chats.ask(question, model)}
        models={models.data}
        selectedModel={selectedModelId}
        onModelChange={setSelectedModelId}
      />
      <PreferencesActionSection />
    </ActionPanel>
  );

  return (
    <List
      searchText={question.data}
      isShowingDetail={chats.data.length > 0 ? true : false}
      filtering={false}
      isLoading={chats.isLoading}
      onSearchTextChange={question.update}
      throttle={false}
      navigationTitle={"Ask"}
      actions={
        !question.data ? (
          <ActionPanel>
            <FormInputActionSection
              initialQuestion={question.data}
              onSubmit={(question) => chats.ask(question, conversation.model)}
              models={models.data}
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
        <ModelDropdown models={models.data} onModelChange={setSelectedModelId} selectedModel={selectedModelId} />
      }
      onSelectionChange={(id) => {
        if (id !== chats.selectedChatId) {
          chats.setSelectedChatId(id);
        }
      }}
      searchBarPlaceholder={chats.data.length > 0 ? "Ask another question..." : "Ask a question..."}
    >
      <ChatView
        data={chats.data}
        question={question.data}
        setConversation={setConversation}
        use={{ chats }}
        model={conversation.model}
        models={models.data}
        selectedModel={selectedModelId}
        onModelChange={setSelectedModelId}
      />
    </List>
  );
}
