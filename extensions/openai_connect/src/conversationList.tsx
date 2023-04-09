import { DestructiveAction } from "./actions/Destructive";
import { PrimaryAction } from "./actions/PrimaryAction";
import { PreferencesActionSection } from "./actions/preferences";
// import { PreferencesActionSection } from "./actions/preferences";
import Ask from "./chat";
import { useConversations } from "./hooks/useConversation";
import { Conversation } from "./types";
import { ActionPanel, Icon, List, useNavigation, Action } from "@raycast/api";
import { FC, useEffect, useState } from "react";

const ConversationView = () => {
  const conversations = useConversations();
  const { push } = useNavigation();

  const [searchText, setSearchText] = useState<string>("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>();

  useEffect(() => {
    setConversation(conversations.data.find((x) => x.id === selectedConversationId));
  }, [selectedConversationId]);

  useEffect(() => {
    if (conversation) {
      conversations.update(conversation);
    }
  }, [conversation]);

  const sortedConversations = conversations.data.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const getActionPanel = (conversation: Conversation) => (
    <ActionPanel>
      <PrimaryAction title="Continue Ask" onAction={() => push(<Ask conversation={conversation} />)} />

      <ActionPanel.Section title="Delete">
        <DestructiveAction
          title="Remove"
          dialog={{
            title: "Are you sure you want to remove this conversation?",
          }}
          onAction={() => conversations.remove(conversation)}
        />
        <DestructiveAction
          title="Clear"
          dialog={{
            title: "Are you sure you want to clear your conversations?",
          }}
          onAction={() => conversations.clear()}
          shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
        />
      </ActionPanel.Section>
      <PreferencesActionSection />
    </ActionPanel>
  );

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
      searchBarPlaceholder="Search conversation..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {conversations.data.length === 0 ? (
        <List.EmptyView
          title="No Conversation"
          description="Your recent conversation will be showed up here"
          icon={Icon.Stars}
        />
      ) : (
        <>
          <List.Section title={"Recent"} subtitle={sortedConversations.length.toLocaleString()}>
            {sortedConversations.map((conversation) => (
              <List.Item
                id={conversation.id}
                key={conversation.id}
                title={conversation.chats[conversation.chats.length - 1].question}
                accessories={[
                  { text: conversation.chats[conversation.chats.length - 1].answer },
                  { tag: conversation.model },
                  { text: new Date(conversation.created_at ?? 0).toLocaleDateString() },
                ]}
                actions={
                  conversation && selectedConversationId === conversation.id ? getActionPanel(conversation) : undefined
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
};

export default ConversationView;
