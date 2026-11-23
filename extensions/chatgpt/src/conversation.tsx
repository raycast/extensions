import { AuthGate } from "./views/auth-required";
import { ActionPanel, Action, Icon, List, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import { DestructiveAction, PinAction, PrimaryAction } from "./actions";
import { PreferencesActionSection } from "./actions/preferences";
import Ask from "./ask";
import { useConversations } from "./hooks/useConversations";
import { Conversation as ConversationType } from "./type";
import { ConversationListView } from "./views/conversation-list";
import { ExportData, ImportData } from "./utils/import-export";
import { ImportForm } from "./views/import-form";
import { uniqueById } from "./utils";

export default function Conversation() {
  return (
    <AuthGate>
      <ConversationContent />
    </AuthGate>
  );
}

function ConversationContent() {
  const conversations = useConversations();
  const { push } = useNavigation();

  const [searchText, setSearchText] = useState<string>("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const sortedConversations = useMemo(
    () => uniqueById(conversations.data).sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)),
    [conversations.data],
  );
  const query = searchText.toLocaleLowerCase();
  const filteredConversations = query
    ? sortedConversations.filter((x) =>
        x.chats.some((x) => x.question.toLowerCase().includes(query) || x.answer.toLowerCase().includes(query)),
      )
    : sortedConversations;

  const pinnedConversation = filteredConversations.filter((x) => x.pinned);

  const uniqueSortedConversations =
    pinnedConversation.length > 0 ? filteredConversations.filter((x) => !x.pinned) : filteredConversations;

  const getActionPanel = (conversation: ConversationType) => (
    <ActionPanel>
      <PrimaryAction title="Continue Ask" onAction={() => push(<Ask conversation={conversation} />)} />
      <PinAction
        title={conversation.pinned ? "Unpin Conversation" : "Pin Conversation"}
        isPinned={conversation.pinned}
        onAction={() => conversations.update({ ...conversation, pinned: !conversation.pinned })}
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
                  const data = await ImportData<ConversationType>("conversations", file);
                  if (!data) return false;
                  await conversations.setConversations(data);
                  return true;
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
                        const data = await ImportData<ConversationType>("conversations", file);
                        if (!data) return false;
                        await conversations.setConversations(data);
                        return true;
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
