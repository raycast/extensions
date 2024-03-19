import { ActionPanel, getPreferenceValues, List, LocalStorage, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { PrimaryAction } from "./actions";
import { FormInputActionSection } from "./actions/form-input";
import { PreferencesActionSection } from "./actions/preferences";
import { useAutoSaveConversation } from "./hooks/useAutoSaveConversation";
import { useChat } from "./hooks/useChat";
import { useConversations } from "./hooks/useConversations";
import { usePrompt } from "./hooks/usePrompt";
import { useQuestion } from "./hooks/useQuestion";
import { useSavedChat } from "./hooks/useSavedChat";
import { Chat, Conversation, Prompt } from "./type";
import { ChatView } from "./views/chat";
import { PromptDropdown } from "./views/prompt/dropdown";
import { QuestionForm } from "./views/question/form";

export default function Ask(props: { initialQuestion?: string; conversation: Conversation }) {
  const conversations = useConversations();
  const prompts = usePrompt();
  const savedChats = useSavedChat();
  const chats = useChat<Chat>(props.conversation ? props.conversation.chats : []);
  const question = useQuestion({
    initialQuestion: props.initialQuestion ? props.initialQuestion : "",
    disableAutoLoad: props.conversation ? true : false,
  });

  const [conversation, setConversation] = useState<Conversation>(props.conversation);

  const [isLoading, setLoading] = useState<boolean>(true);

  const [selectedPromp, setSelectedPromp] = useState<Prompt>(props.conversation.prompt);

  const [isAutoFullInput] = useState(() => {
    return getPreferenceValues<{
      isAutoFullInput: boolean;
    }>().isAutoFullInput;
  });

  const { push, pop } = useNavigation();

  useEffect(() => {
    if (
      isAutoFullInput &&
      (conversation.chats.length === 0 || (conversation.chats.length > 0 && question.data.length > 0))
    ) {
      push(
        <QuestionForm
          initialQuestion={question.data}
          onSubmit={(question) => {
            chats.ask(question, conversation.prompt);
            pop();
          }}
          prompts={prompts.data}
          selectedPrompt={selectedPromp}
          onPromptChange={setSelectedPromp}
        />
      );
    }

    setLoading(false);
  }, [prompts.data, question.data]);

  useEffect(() => {
    if (props.conversation?.id !== conversation.id || conversations.data.length === 0) {
      conversations.add(conversation);
    }
  }, []);

  useEffect(() => {
    conversations.update(conversation);
  }, [conversation]);

  useEffect(() => {
    if (prompts.data && conversation.chats.length === 0) {
      const defaultUserPrompt = conversation.prompt;
      setConversation({ ...conversation, prompt: defaultUserPrompt, updated_at: new Date().toISOString() });
    }
  }, [prompts.data]);

  useEffect(() => {
    const updatedConversation = { ...conversation, chats: chats.data, updated_at: new Date().toISOString() };
    setConversation(updatedConversation);
  }, [chats.data]);

  useEffect(() => {
    const selectedPrompt = prompts.data.find((x) => x.id === selectedPromp.id);
    //console.debug("selectedPrompt: ", selectedPromp, selectedPrompt?.option);
    setConversation({
      ...conversation,
      prompt: selectedPrompt ?? { ...conversation.prompt },
      updated_at: new Date().toISOString(),
    });
  }, [selectedPromp, prompts.data]);

  const getActionPanel = (question: string, prompt: Prompt) => (
    <ActionPanel>
      <PrimaryAction title="Get Answer" onAction={() => chats.ask(question, prompt)} />
      <FormInputActionSection
        initialQuestion={question}
        onSubmit={(question) => chats.ask(question, prompt)}
        prompts={prompts.data}
        selectedPrompt={selectedPromp}
        onPromptChange={setSelectedPromp}
      />
      <PreferencesActionSection />
    </ActionPanel>
  );

  return (
    <List
      searchText={question.data}
      isShowingDetail={chats.data.length > 0}
      filtering={false}
      isLoading={isLoading || question.isLoading || chats.isLoading || prompts.isLoading}
      onSearchTextChange={question.update}
      throttle={false}
      navigationTitle={"Ask"}
      actions={
        !question.data ? (
          <ActionPanel>
            <FormInputActionSection
              initialQuestion={question.data}
              onSubmit={(question) => chats.ask(question, conversation.prompt)}
              prompts={prompts.data}
              selectedPrompt={selectedPromp}
              onPromptChange={setSelectedPromp}
            />
            <PreferencesActionSection />
          </ActionPanel>
        ) : (
          getActionPanel(question.data, conversation.prompt)
        )
      }
      selectedItemId={chats.selectedChatId || undefined}
      searchBarAccessory={
        <PromptDropdown prompts={prompts.data} onPromptChange={setSelectedPromp} selectedPrompt={selectedPromp} />
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
        use={{ chats, conversations, savedChats }}
        conversation={conversation}
        prompts={prompts.data}
        selectedPrompt={selectedPromp}
        onPromptChange={setSelectedPromp}
      />
    </List>
  );
}
