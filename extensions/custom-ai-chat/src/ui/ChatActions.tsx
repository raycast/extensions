import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import type { Conversation } from "../types";

interface ChatActionsProps {
  conversation: Conversation;
  searchText: string;
  isSending: boolean;
  onSend: (conversation: Conversation, prompt: string) => void | Promise<void>;
  onCancel: () => void | Promise<void>;
  onRegenerate: (conversation: Conversation) => void | Promise<void>;
  onNewConversation: () => void | Promise<void>;
  onDeleteConversation: (conversation: Conversation) => void | Promise<void>;
  onAddModel: () => void;
  onEditModel: () => void | Promise<void>;
}

export function ChatActions({
  conversation,
  searchText,
  isSending,
  onSend,
  onCancel,
  onRegenerate,
  onNewConversation,
  onDeleteConversation,
  onAddModel,
  onEditModel,
}: ChatActionsProps) {
  return (
    <ActionPanel>
      {isSending ? (
        <Action
          title="Stop Generation"
          icon={Icon.Stop}
          shortcut={{ modifiers: ["ctrl"], key: "c" }}
          onAction={() => void onCancel()}
        />
      ) : (
        <Action title="Send Message" icon={Icon.ArrowRight} onAction={() => void onSend(conversation, searchText)} />
      )}
      <Action title="Regenerate Response" icon={Icon.ArrowClockwise} onAction={() => void onRegenerate(conversation)} />
      <Action
        title="New Conversation"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        onAction={() => void onNewConversation()}
      />
      <Action
        title="Delete Conversation"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={Keyboard.Shortcut.Common.Remove}
        onAction={() => void onDeleteConversation(conversation)}
      />
      <Action title="Add Model" icon={Icon.Plus} shortcut={Keyboard.Shortcut.Common.Duplicate} onAction={onAddModel} />
      <Action title="Edit Model" icon={Icon.Pencil} shortcut={Keyboard.Shortcut.Common.Edit} onAction={onEditModel} />
    </ActionPanel>
  );
}
