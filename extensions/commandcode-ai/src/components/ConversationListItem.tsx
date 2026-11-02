import { Action, ActionPanel, Icon, List, Keyboard, confirmAlert, Alert } from "@raycast/api";
import type { Conversation } from "../types";
import { formatConversationForCopy } from "../utils/conversation";
import { ConversationDetailView } from "./ConversationDetailView";
import { AskQuestionView } from "./AskQuestionView";

interface ConversationListItemProps {
  conversation: Conversation;
  addConversation: (conversation: Conversation) => Promise<void>;
  updateConversation: (id: string, update: (saved: Conversation) => Partial<Conversation>) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  deleteAllConversations: () => Promise<void>;
}

export function ConversationListItem({
  conversation,
  addConversation,
  updateConversation,
  deleteConversation,
  deleteAllConversations,
}: ConversationListItemProps) {
  return (
    <List.Item
      icon={Icon.Message}
      title={conversation.title}
      subtitle={new Date(conversation.timestamp).toLocaleString()}
      accessories={[{ text: `${conversation.messages.length / 2} messages` }, { text: conversation.model }]}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Conversation"
            icon={Icon.Eye}
            target={<ConversationDetailView conversation={conversation} updateConversation={updateConversation} />}
          />
          <Action.Push
            title="Start New Conversation"
            icon={Icon.PlusCircle}
            target={
              <AskQuestionView
                initialQuestion=""
                addConversation={addConversation}
                updateConversation={updateConversation}
              />
            }
          />
          <Action.CopyToClipboard
            title="Copy Conversation"
            content={formatConversationForCopy(conversation)}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action
            title="Delete Conversation"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ macOS: { modifiers: ["ctrl"], key: "x" }, Windows: { modifiers: ["ctrl"], key: "x" } }}
            onAction={async () => {
              if (
                await confirmAlert({
                  title: "Delete Conversation",
                  message: `Delete "${conversation.title}"? This action cannot be undone.`,
                  primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                })
              ) {
                await deleteConversation(conversation.id);
              }
            }}
          />
          <Action
            title="Delete All Conversations"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "delete" },
              Windows: { modifiers: ["ctrl", "shift"], key: "delete" },
            }}
            onAction={async () => {
              if (
                await confirmAlert({
                  title: "Delete All Conversations",
                  message: "Are you sure you want to delete all conversations? This action cannot be undone.",
                  primaryAction: { title: "Delete All", style: Alert.ActionStyle.Destructive },
                })
              ) {
                await deleteAllConversations();
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}
