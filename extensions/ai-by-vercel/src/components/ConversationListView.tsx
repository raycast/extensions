import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState, useMemo } from "react";
import type { Conversation } from "../types";
import { ConversationListItem } from "./ConversationListItem";
import { AskQuestionView } from "./AskQuestionView";

interface ConversationListViewProps {
  conversations: Conversation[];
  isLoading: boolean;
  addConversation: (conversation: Conversation) => Promise<void>;
  updateConversation: (id: string, updates: Partial<Conversation>) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  deleteAllConversations: () => Promise<void>;
}

export function ConversationListView({
  conversations,
  isLoading,
  addConversation,
  updateConversation,
  deleteConversation,
  deleteAllConversations,
}: ConversationListViewProps) {
  const [searchText, setSearchText] = useState("");

  const filteredConversations = useMemo(
    () => conversations.filter((conv) => conv.title.toLowerCase().includes(searchText.toLowerCase())),
    [conversations, searchText],
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Conversation History"
      searchBarPlaceholder="Search conversations..."
      onSearchTextChange={setSearchText}
    >
      {!searchText && (
        <List.Item
          icon={Icon.PlusCircle}
          title="New Conversation"
          accessories={[{ text: "Ask a new question" }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Start New Conversation"
                icon={Icon.Message}
                target={
                  <AskQuestionView
                    initialQuestion=""
                    addConversation={addConversation}
                    updateConversation={updateConversation}
                  />
                }
              />
            </ActionPanel>
          }
        />
      )}

      {searchText && filteredConversations.length === 0 && (
        <List.Item
          icon={Icon.PlusCircle}
          title="New Conversation"
          subtitle={`Ask: "${searchText}"`}
          accessories={[{ text: "Press Enter to start" }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Start New Conversation with Search Text"
                icon={Icon.Message}
                target={
                  <AskQuestionView
                    initialQuestion={searchText}
                    addConversation={addConversation}
                    updateConversation={updateConversation}
                  />
                }
              />
            </ActionPanel>
          }
        />
      )}

      {!searchText && conversations.length === 0 ? (
        <List.EmptyView
          icon={Icon.Message}
          title="No conversations yet"
          description="Start a new conversation to see it here"
        />
      ) : (
        filteredConversations.map((conv) => (
          <ConversationListItem
            key={conv.id}
            conversation={conv}
            addConversation={addConversation}
            updateConversation={updateConversation}
            deleteConversation={deleteConversation}
            deleteAllConversations={deleteAllConversations}
          />
        ))
      )}
    </List>
  );
}
