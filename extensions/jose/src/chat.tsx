import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { useChat } from "./hook/useChat";
import { useConversations } from "./hook/useConversations";
import { useQuestion } from "./hook/useQuestion";
import { ConversationType, GetNewConversation } from "./type/conversation";
import { ChatView } from "./view/chat/view";
import { useAssistant } from "./hook/useAssistant";
import { AssistantDefault } from "./type/assistant";
import { ChatFullForm } from "./view/chat/form";
import { useSnippet } from "./hook/useSnippet";
import { GetNewSnippet } from "./type/snippet";
import { ChatDropdown } from "./view/chat/dropdown";
import {
  ConversationSelectedTypeAssistant,
  ConversationSelectedTypeSnippet,
  ITalkAssistant,
  ITalkSnippet,
} from "./ai/type";

export default function Chat(props: { conversation?: ConversationType; arguments?: { ask: string } }) {
  const { push } = useNavigation();
  const conversations = useConversations();
  const assistants = useAssistant();
  const snippets = useSnippet();
  const chats = useChat();
  const question = useQuestion({
    initialQuestion: props.arguments && props.arguments.ask ? props.arguments.ask : "",
    // disableAutoLoad: props.conversation ? true : props.arguments && props.arguments.ask ? true : false,
    disableAutoLoad: false,
  });
  const isLoadConversation = props.conversation ? true : false;

  const [conversation, setConversation] = useState<ConversationType>(
    props.conversation ? props.conversation : GetNewConversation(AssistantDefault[0], false)
  );
  const [selectedAssistant, setSelectedAssistant] = useState<ITalkAssistant>(
    props.conversation && props.conversation.assistant ? props.conversation.assistant : AssistantDefault[0]
  );
  const [selectedSnippet, setSelectedSnippet] = useState<ITalkSnippet | undefined>(
    props.conversation && props.conversation.snippet ? props.conversation.snippet : GetNewSnippet()
  );

  useEffect(() => {
    if (props.conversation?.conversationId !== conversation.conversationId || conversations.data.length === 0) {
      conversations.add(conversation);
    }
  }, []);
  useEffect(() => {
    if (conversation.cleared === true && conversation.chats.length === 0) {
      conversations.add(conversation);
    } else {
      conversations.update(conversation);
    }
  }, [conversation]);
  useEffect(() => {
    if (assistants.data && conversation.chats.length === 0) {
      setConversation({ ...conversation, assistant: selectedAssistant, updatedAt: new Date().toISOString() });
    }
  }, [assistants.data]);
  useEffect(() => {
    if (selectedSnippet !== undefined && snippets.data && conversation.chats.length === 0) {
      setConversation({ ...conversation, snippet: selectedSnippet, updatedAt: new Date().toISOString() });
    }
  }, [snippets.data]);
  useEffect(() => {
    if (isLoadConversation === false && conversation.cleared === false && conversation.chats.length === 0) {
      const convs = conversations.data
        .filter((conversation: ConversationType) => conversation.chats.length > 0)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      if (convs[0]) {
        console.info("load last conversation");
        setSelectedAssistant(convs[0].assistant);
        setConversation(convs[0]);
      }
    }
  }, [conversations.data]);
  useEffect(() => {
    const updatedConversation = { ...conversation, chats: chats.data, updatedAt: new Date().toISOString() };
    setConversation(updatedConversation);
  }, [chats.data]);
  useEffect(() => {
    const selected = assistants.data.find((x: ITalkAssistant) => x.assistantId === selectedAssistant.assistantId);
    conversation.selectedType = ConversationSelectedTypeAssistant;
    setConversation({
      ...conversation,
      assistant: selected ?? conversation.assistant,
      updatedAt: new Date().toISOString(),
    });
  }, [selectedAssistant]);
  useEffect(() => {
    if (selectedSnippet !== undefined) {
      const selected = snippets.data.find((x: ITalkSnippet) => x.snippetId === selectedSnippet.snippetId);
      conversation.selectedType = ConversationSelectedTypeSnippet;
      setConversation({
        ...conversation,
        snippet: selected ?? conversation.snippet,
        updatedAt: new Date().toISOString(),
      });
    }
  }, [selectedSnippet]);

  const getActionPanel = (question: string) => (
    <ActionPanel>
      <Action title="Get Answer" icon={Icon.ArrowRight} onAction={() => chats.ask(question, undefined, conversation)} />
      <ActionPanel.Section title="Input">
        <Action
          title="Full Text Input"
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          icon={Icon.Text}
          onAction={() => {
            push(
              <ChatFullForm
                initialQuestion={question}
                onSubmit={(question: string, file: string[] | undefined) => chats.ask(question, file, conversation)}
              />
            );
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <List
      searchText={question.data}
      isShowingDetail={conversation.chats.length > 0 ? true : false}
      filtering={false}
      isLoading={question.isLoading ? question.isLoading : chats.isLoading}
      onSearchTextChange={question.update}
      throttle={false}
      navigationTitle={"Ask " + selectedAssistant.title}
      actions={
        !question.data ? (
          <ActionPanel>
            <ActionPanel.Section title="Input">
              <Action
                title="Full Text Input"
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                icon={Icon.Text}
                onAction={() => {
                  push(
                    <ChatFullForm
                      initialQuestion={question.data}
                      onSubmit={(question: string, file: string[] | undefined) =>
                        chats.ask(question, file, conversation)
                      }
                    />
                  );
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        ) : (
          getActionPanel(question.data)
        )
      }
      selectedItemId={chats.selectedChatId || undefined}
      searchBarAccessory={
        <ChatDropdown
          assistants={assistants.data}
          snippets={snippets.data}
          selectedAssistant={selectedAssistant}
          onAssistantChange={setSelectedAssistant}
          onSnippetChange={setSelectedSnippet}
        />
      }
      onSelectionChange={(id: string | null) => {
        if (id !== null && id !== chats.selectedChatId) {
          chats.setSelectedChatId(id);
        }
      }}
      searchBarPlaceholder={
        selectedAssistant.title + (chats.data.length > 0 ? " - Ask another question..." : " - Ask a question...")
      }
    >
      <ChatView
        data={conversation.chats}
        question={question.data}
        conversation={conversation}
        setConversation={setConversation}
        use={{ chats, conversations }}
        selectedAssistant={selectedAssistant}
      />
    </List>
  );
}
