import { ActionPanel, Icon, List, useNavigation, confirmAlert, Alert, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import Chat from "./chat";
import { useConversations } from "./hook/useConversations";
import { ConversationListView } from "./view/chat/conversationList";
import { ConversationType } from "./type/conversation";
import { ITalk } from "./ai/type";
import { needOnboarding } from "./type/config";
import { Onboarding } from "./view/onboarding/start";
import { useAssistant } from "./hook/useAssistant";
import { OnboardingEmpty } from "./view/onboarding/empty";

export default function Conversation() {
  const { push } = useNavigation();
  const conversations = useConversations();
  const collectionsAssistant = useAssistant();

  const [searchText, setSearchText] = useState<string>("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationType | null>();

  useEffect(() => {
    setConversation(conversations.data.find((x: ConversationType) => x.conversationId === selectedConversationId));
  }, [selectedConversationId]);

  useEffect(() => {
    if (conversation) {
      conversations.update(conversation);
    }
  }, [conversation]);

  const uniqueConversations = conversations.data.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (value: any, index: any, self: any) =>
      index === self.findIndex((conversation: ConversationType) => conversation.conversationId === value.conversationId)
  );

  const filteredConversations = searchText
    ? uniqueConversations.filter((x: ConversationType) =>
        x.chats.some(
          (x: ITalk) =>
            x.conversation.question.content.toLowerCase().includes(searchText.toLocaleLowerCase()) ||
            x.result?.content.toLowerCase().includes(searchText.toLocaleLowerCase())
        )
      )
    : uniqueConversations;

  const sortedConversations = filteredConversations.sort(
    (a: ConversationType, b: ConversationType) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const getActionPanel = (conversation: ConversationType) => (
    <ActionPanel>
      <Action title="Conrinue Ask" icon={Icon.ArrowRight} onAction={() => push(<Chat conversation={conversation} />)} />
      <ActionPanel.Section title="Delete">
        <Action
          style={Action.Style.Destructive}
          icon={Icon.RotateAntiClockwise}
          title="Remove"
          onAction={async () => {
            await confirmAlert({
              title: "Are you sure you want to remove this conversation?",
              message: "This action cannot be undone",
              icon: Icon.RotateAntiClockwise,
              primaryAction: {
                title: "Remove",
                style: Alert.ActionStyle.Destructive,
                onAction: () => {
                  conversations.remove(conversation);
                },
              },
            });
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
  let searchBarPlaceholder = "Search conversation...";
  let getAction = undefined;
  let noAssistant = false;

  if (needOnboarding(collectionsAssistant.data.length) || collectionsAssistant.data.length === 0) {
    getAction = (
      <ActionPanel>
        <Action
          title="Onboarding"
          icon={Icon.Exclamationmark}
          onAction={() => {
            push(<Onboarding />);
          }}
        />
      </ActionPanel>
    );
    searchBarPlaceholder = "No assistant, first start onboarding to create your first assistant!";
    noAssistant = true;
  }

  return (
    <List
      isShowingDetail={false}
      isLoading={conversations.isLoading}
      filtering={false}
      throttle={false}
      selectedItemId={selectedConversationId || undefined}
      onSelectionChange={(id) => {
        if (id !== selectedConversationId) {
          setSelectedConversationId(id);
        }
      }}
      actions={getAction}
      searchBarPlaceholder={searchBarPlaceholder}
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {noAssistant || conversations.data.length === 0 ? (
        noAssistant ? (
          <OnboardingEmpty />
        ) : (
          <List.EmptyView
            title="No Conversation"
            description="Your recent conversation will be showed up here"
            icon={Icon.Stars}
          />
        )
      ) : (
        <>
          {sortedConversations && (
            <ConversationListView
              title="Recent"
              conversations={sortedConversations}
              selectedConversation={selectedConversationId}
              actionPanel={getActionPanel}
            />
          )}
        </>
      )}
    </List>
  );
}
