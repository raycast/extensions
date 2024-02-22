import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import { Chat, ChatManager } from "../../../lib/chats/types";

/**
 * Actions section for enabling/disabling chat context settings.
 * @returns An ActionPanel.Section component.
 */
export default function ContextSettingsActionSection(props: {
  chat: Chat | undefined;
  chats: ChatManager;
  useFileContext: boolean;
  useConversationContext: boolean;
  useAutonomousFeatures: boolean;
  setUseFileContext: React.Dispatch<React.SetStateAction<boolean>>;
  setUseConversationContext: React.Dispatch<React.SetStateAction<boolean>>;
  setUseAutonomousFeatures: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const {
    chat,
    chats,
    useFileContext,
    useConversationContext,
    useAutonomousFeatures,
    setUseFileContext,
    setUseConversationContext,
    setUseAutonomousFeatures,
  } = props;
  return (
    <ActionPanel.Section title="Context Settings">
      <Action
        title="Use File Selection"
        icon={
          useFileContext
            ? { source: Icon.CheckCircle, tintColor: Color.Green }
            : { source: Icon.XMarkCircle, tintColor: Color.Red }
        }
        onAction={async () => {
          if (chat) {
            await chats.setChatProperty(chat, "useSelectedFilesContext", !useFileContext);
            await chats.revalidate();
          }
          setUseFileContext(!useFileContext);
        }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
      />

      <Action
        title="Use Conversation History"
        icon={
          useConversationContext
            ? { source: Icon.CheckCircle, tintColor: Color.Green }
            : { source: Icon.XMarkCircle, tintColor: Color.Red }
        }
        onAction={async () => {
          if (chat) {
            await chats.setChatProperty(chat, "useConversationContext", !useConversationContext);
            await chats.revalidate();
          }
          setUseConversationContext(!useConversationContext);
        }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
      />

      <Action
        title="Allow AI To Run Commands"
        icon={
          useAutonomousFeatures
            ? { source: Icon.CheckCircle, tintColor: Color.Green }
            : { source: Icon.XMarkCircle, tintColor: Color.Red }
        }
        onAction={async () => {
          if (chat) {
            await chats.setChatProperty(chat, "allowAutonomy", !useAutonomousFeatures);
            await chats.revalidate();
          }
          setUseAutonomousFeatures(!useAutonomousFeatures);
        }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      />
    </ActionPanel.Section>
  );
}
