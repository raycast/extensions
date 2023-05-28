import { ActionPanel, List, showToast, Toast } from "@raycast/api";
import { v4 as uuidv4 } from "uuid";
import { PreferencesActionSection } from "./actions/preferences";
import { useEffect, useState } from "react";
import { useChat } from "./hooks/useChat";
import { PrimaryAction } from "./actions";
import { Chat, Conversation, TemplateModel } from "./type";
import { FormInputActionSection } from "./actions/form-input";
import { useQuestion } from "./hooks/useQuestion";
import { ChatView } from "./views/chat";
import { useConversations } from "./hooks/useConversations";
import { useSavedChat } from "./hooks/useSavedChat";
import { useAutoSaveConversation } from "./hooks/useAutoSaveConversation";
import { DEFAULT_TEMPLATE_MODE, useMyTemplateModel } from "./hooks/useMyTemplateModel";
import { ModelDropdown } from "./views/model/dropdown";

export default function Ask(props: { conversation?: Conversation; templateId?: number }) {
  const chats = useChat<Chat>(props.conversation ? props.conversation.chats : []);
  const conversations = useConversations();
  const savedChats = useSavedChat();
  const isAutoSaveConversation = useAutoSaveConversation();
  const question = useQuestion({ initialQuestion: "", disableAutoLoad: !!props.conversation });
  const [isLoading, setLoading] = useState<boolean>(true);
  const myTemplateModel = useMyTemplateModel();
  const [error, setError] = useState<Error>();
  // const {push, pop} = useNavigation();

  const [conversation, setConversation] = useState<Conversation>(
    props.conversation ?? {
      chats: [],
      created_at: new Date().toISOString(),
      id: uuidv4(),
      model: DEFAULT_TEMPLATE_MODE,
      pinned: false,
      updated_at: "",
    }
  );

  const [selectedTemplateModelId, setSelectedTemplateModelId] = useState<number>(
    props.conversation ? props.conversation.model.template_id : props.templateId ? props.templateId : 0
  );

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      }).then();
    }
  }, [error]);

  useEffect(() => {
    if ((props.conversation?.id !== conversation.id || conversations.data.length === 0) && isAutoSaveConversation) {
      conversations.add(conversation).then();
      if (props.conversation?.model.template_id) {
        setSelectedTemplateModelId(props.conversation.model.template_id);
      }
    }

    if (props.templateId) {
      setSelectedTemplateModelId(props.templateId);
    }
  }, []);

  useEffect(() => {
    if (!myTemplateModel.isLoading) {
      setLoading(false);
    }
  }, [myTemplateModel.isLoading]);

  useEffect(() => {
    conversations.update(conversation).then();
  }, [conversation]);

  useEffect(() => {
    const updatedConversation = { ...conversation, chats: chats.data, updated_at: new Date().toISOString() };
    setConversation(updatedConversation);
  }, [chats.data]);

  useEffect(() => {
    const selectedTemplateModel = myTemplateModel.data.find(
      (x) => x.template_id.toString() === selectedTemplateModelId.toString()
    );
    setConversation({
      ...conversation,
      model: selectedTemplateModel ?? { ...conversation.model },
      updated_at: new Date().toISOString(),
    });
  }, [selectedTemplateModelId]);

  const getActionPanel = (question: string, model: TemplateModel) => {
    return (
      <ActionPanel>
        <PrimaryAction title="Get Answer" onAction={() => chats.ask(question, model || {})} />
        <FormInputActionSection
          initialQuestion={question}
          onSubmit={(question) => chats.ask(question, model)}
          templateModels={myTemplateModel.data}
          selectedTemplateModelId={selectedTemplateModelId}
          onTemplateModelChange={setSelectedTemplateModelId}
        />
        <PreferencesActionSection />
      </ActionPanel>
    );
  };

  return (
    <List
      searchText={question.data}
      isShowingDetail={chats.data.length > 0}
      isLoading={isLoading ? isLoading : question.isLoading ? question.isLoading : chats.isLoading}
      navigationTitle={"Ask"}
      onSearchTextChange={question.update}
      filtering={false}
      throttle={false}
      selectedItemId={chats.selectedChatId || undefined}
      searchBarPlaceholder={chats.data.length > 0 ? "Ask another question..." : "Ask a question..."}
      onSelectionChange={(id) => {
        if (id !== chats.selectedChatId) {
          chats.setSelectedChatId(id);
        }
      }}
      searchBarAccessory={
        <ModelDropdown
          templateModels={myTemplateModel.data}
          selectedTemplateModelId={selectedTemplateModelId}
          onTemplateModelChange={setSelectedTemplateModelId}
          disableChange={chats.data.length > 0}
        />
      }
      actions={
        !question.data ? (
          <ActionPanel>
            <FormInputActionSection
              initialQuestion={question.data}
              onSubmit={(question: string) => chats.ask(question, conversation.model)}
              templateModels={myTemplateModel.data}
              selectedTemplateModelId={selectedTemplateModelId}
              onTemplateModelChange={setSelectedTemplateModelId}
            />
            <PreferencesActionSection />
          </ActionPanel>
        ) : (
          getActionPanel(question.data, conversation.model)
        )
      }
    >
      <ChatView
        data={chats.data}
        question={question.data}
        isAutoSaveConversation={isAutoSaveConversation}
        setConversation={setConversation}
        use={{ chats, conversations, savedChats }}
        conversation={conversation}
        templateModels={myTemplateModel.data}
        selectedTemplateModelId={selectedTemplateModelId}
        onTemplateModelChange={setSelectedTemplateModelId}
        onSubmit={(question) => chats.ask(question, conversation.model)}
      />
    </List>
  );
}
