import { Action, Alert, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { Chat, ChatManager } from "../../../utils/types";
import { defaultAdvancedSettings } from "../../../data/default-advanced-settings";
import { getActionShortcut } from "../../../utils/action-utils";

/**
 * Action to delete a chat.
 * @param props.chat The chat to delete.
 * @param props.chats The chat manager object.
 * @param props.setCurrentChat The function to update the current chat.
 * @returns An action component.
 */
export const DeleteChatAction = (props: {
  chat: Chat;
  chats: ChatManager;
  setCurrentChat: (value: React.SetStateAction<Chat | undefined>) => void;
  settings: typeof defaultAdvancedSettings;
}) => {
  const { chat, chats, setCurrentChat, settings } = props;
  return (
    <Action
      title="Delete Chat"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={getActionShortcut("DeleteChatAction", settings)}
      onAction={async () => {
        if (
          await confirmAlert({
            title: "Delete Chat",
            message: "Are you sure?",
            primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
          })
        ) {
          setCurrentChat(undefined);
          await chats.deleteChat(chat.name);
          await chats.revalidate();
          await showToast({ title: "Chat Deleted" });
        }
      }}
    />
  );
};

/**
 * Action to delete all chats.
 * @param props.chats The chat manager object.
 * @param props.setCurrentChat The function to update the current chat.
 * @returns An action component.
 */
export const DeleteAllChatsAction = (props: {
  chats: ChatManager;
  setCurrentChat: (value: React.SetStateAction<Chat | undefined>) => void;
  settings: typeof defaultAdvancedSettings;
}) => {
  const { chats, setCurrentChat, settings } = props;
  return (
    <Action
      title="Delete All Chats"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={getActionShortcut("DeleteAllChatsAction", settings)}
      onAction={async () => {
        if (
          await confirmAlert({
            title: `Delete ${chats.chats.length} Chat${chats.chats.length == 1 ? "" : "s"}}`,
            message: "Are you sure?",
            primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
          })
        ) {
          const toast = await showToast({ title: "Deleting Chats...", style: Toast.Style.Animated });
          const totalCount = chats.chats.length;
          setCurrentChat(undefined);
          for (let i = 0; i < chats.chats.length; i++) {
            const chat = chats.chats[i];
            await chats.deleteChat(chat.name);
            toast.message = `${i + 1} of ${totalCount}`;
          }
          await chats.revalidate();
          toast.title = `${totalCount} Chats Deleted`;
          toast.message = "";
          toast.style = Toast.Style.Success;
        }
      }}
    />
  );
};
