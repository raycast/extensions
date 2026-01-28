import { ActionPanel, Action, Icon, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { DestructiveAction, PinAction, PrimaryAction } from "./actions";
import { PreferencesActionSection } from "./actions/preferences";
import Ask from "./ask";
import { useConversations } from "./hooks/useConversations";
import { Conversation as ConversationType } from "./type";
import { ConversationListView } from "./views/conversation-list";
import { ExportData, ImportData } from "./utils/import-export";
import { ImportForm } from "./views/import-form";

export default function Conversation() {
  const conversations = useConversations();
  const { push } = useNavigation();

  const [searchText, setSearchText] = useState<string>("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationType | null>();

  useEffect(() => {
    setConversation(conversations.data.find((x) => x.id === selectedConversationId));
  }, [selectedConversationId]);

  useEffect(() => {
    if (conversation) {
      conversations.update(conversation);
    }
  }, [conversation]);

  const uniqueConversations = conversations.data.filter(
    (value, index, self) => index === self.findIndex((conversation) => conversation.id === value.id),
  );

  const filteredConversations = searchText
    ? uniqueConversations.filter((x) =>
        x.chats.some(
          (x) =>
            x.question.toLowerCase().includes(searchText.toLocaleLowerCase()) ||
            x.answer.toLowerCase().includes(searchText.toLocaleLowerCase()),
        ),
      )
    : uniqueConversations;

  const sortedConversations = filteredConversations.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );

  const pinnedConversation = sortedConversations.filter((x) => x.pinned);

  const uniqueSortedConversations =
    pinnedConversation.length > 0 ? sortedConversations.filter((x) => !x.pinned) : sortedConversations;

  const getActionPanel = (conversation: ConversationType) => (
    <ActionPanel>
      <PrimaryAction title="Continue Ask" onAction={() => push(<Ask conversation={conversation} />)} />
      <PinAction
        title={conversation.pinned ? "Unpin Conversation" : "Pin Conversation"}
        isPinned={conversation.pinned}
        onAction={() => setConversation({ ...conversation, pinned: !conversation.pinned })}
      />
      <ActionPanel.Section title="Import/Export">
        <Action
          title={"Export Conversation"}
          icon={Icon.Upload}
          onAction={() => ExportData(conversations.data, "Conversation")}
        />
        <Action
          title={"Import Conversation"}
          icon={Icon.Download}
          onAction={() =>
            push(
              <ImportForm
                moduleName="Conversation"
                onSubmit={async (file) => {
                  ImportData<ConversationType>("conversations", file).then((data) => {
                    conversations.setConversations(data);
                  });
                }}
              />,
            )
          }
        />
      </ActionPanel.Section>
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
          actions={
            <ActionPanel>
              <Action
                title={"Import Conversation"}
                icon={Icon.Download}
                onAction={() =>
                  push(
                    <ImportForm
                      moduleName="Conversation"
                      onSubmit={async (file) => {
                        ImportData<ConversationType>("conversations", file).then((data) => {
                          conversations.setConversations(data);
                        });
                      }}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {pinnedConversation.length > 0 && (
            <ConversationListView
              title="Pinned"
              conversations={pinnedConversation}
              selectedConversation={selectedConversationId}
              actionPanel={getActionPanel}
            />
          )}
          {uniqueSortedConversations && (
            <ConversationListView
              title="Recent"
              conversations={uniqueSortedConversations}
              selectedConversation={selectedConversationId}
              actionPanel={getActionPanel}
            />
          )}
        </>
      )}
    </List>
  );
}
