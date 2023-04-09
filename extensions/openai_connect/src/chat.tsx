import { PrimaryAction } from "./actions/PrimaryAction";
import { CopyActionSection } from "./actions/copy";
import { PreferencesActionSection } from "./actions/preferences";
import { FormInputActionSection } from "./actions/questionform";
import { ChatListItem } from "./components/ChatListItem";
import { EmptyView } from "./components/EmptyView";
import { ModelDropdown } from "./components/modelDropdown";
import { useChat } from "./hooks/useChat";
import { useConversations } from "./hooks/useConversation";
import { useModel } from "./hooks/useModel";
import { encode } from "./libs/encoder";
import { Chat, Conversation } from "./types";
import { ActionPanel, getPreferenceValues, List, showToast, useNavigation, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

export default function Ask(props: { conversation?: Conversation }) {
  const [textPrompt, setTextPrompt] = useState("");
  const models = useModel(props.conversation?.model);
  const [isInvalid, setIsInvalid] = useState(false);

  const conversations = useConversations();
  const [conversation, setConversation] = useState<Conversation>(
    props.conversation || {
      id: uuidv4(),
      chats: [],
      updated_at: "",
      created_at: new Date().toISOString(),
      model: models.selectedModelName,
    }
  );
  const chats = useChat<Chat>(props.conversation ? props.conversation.chats : []);

  const actionPanel = (question: string) => {
    return (
      <ActionPanel>
        <PrimaryAction
          title="Get Answer"
          onAction={() => {
            console.log("get answer");
            if (isInvalid) {
              showToast({
                title: "exceed max token",
                message: "Please enter a shorter question",
                style: Toast.Style.Failure,
              });
            } else {
              chats.ask(question, models.selectedModelName, conversation.id);
            }
          }}
        />
        <FormInputActionSection question={textPrompt} chats={chats} models={models} conversation={conversation} />
        <PreferencesActionSection />
      </ActionPanel>
    );
  };

  useEffect(() => {
    console.log("conversation Props", conversation);
  }, []);

  useEffect(() => {
    if (props.conversation?.id !== conversation.id && !props.conversation?.id) {
      console.log("invoke add");
      conversations.add(conversation);
    }
  }, []);

  useEffect(() => {
    conversations.update(conversation);
    console.log("conversation", conversation);
  }, [conversation]);

  useEffect(() => {
    const updatedConversation = { ...conversation, chats: chats.data, updated_at: new Date().toISOString() };
    setConversation(updatedConversation);
  }, [chats.data]);

  useEffect(() => {
    if (models.selectedModelName) {
      setConversation({ ...conversation, model: models.selectedModelName, updated_at: new Date().toISOString() });
    }
  }, [models.selectedModelName]);
  return (
    <List
      searchBarPlaceholder={"Search for a conversation..."}
      searchText={textPrompt}
      isShowingDetail={chats.data.length > 0 ? true : false}
      // onSearchTextChange={(text) => setTextPrompt(text)}
      onSearchTextChange={(text) => {
        setTextPrompt(text);
        const encoded = encode(text);
        const tokenCount = encoded.length;
        if (tokenCount + models.maxTokenOffset > models.maxModelTokens) {
          setIsInvalid(true);
        } else {
          setIsInvalid(false);
        }
      }}
      isLoading={false}
      selectedItemId={chats.selectedChatId || undefined}
      filtering={false}
      onSelectionChange={(id) => {
        if (id !== chats.selectedChatId) {
          chats.setSelectedChatId(id);
        }
      }}
      searchBarAccessory={
        <>
          <ModelDropdown
            models={models.data}
            onModelChange={models.setSelectedModelName}
            selectedModel={models.selectedModelName}
          />
        </>
      }
      throttle={false}
      actions={
        !textPrompt ? (
          <ActionPanel>
            <FormInputActionSection question="" chats={chats} models={models} conversation={conversation} />
            <PreferencesActionSection />
          </ActionPanel>
        ) : (
          actionPanel(textPrompt)
        )
      }
    >
      {chats.data.length === 0 ? (
        <EmptyView />
      ) : (
        <ChatListItem
          chats={chats}
          question={textPrompt}
          models={models}
          isInvalid={isInvalid}
          setConversation={setConversation}
          conversation={conversation}
        />
      )}
    </List>
  );
}
