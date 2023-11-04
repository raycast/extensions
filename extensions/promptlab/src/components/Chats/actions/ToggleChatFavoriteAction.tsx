import { Action, Icon } from "@raycast/api";
import { Chat, ChatManager } from "../../../utils/types";
import { defaultAdvancedSettings } from "../../../data/default-advanced-settings";
import { getActionShortcut } from "../../../utils/action-utils";

/**
 * Action to toggle a chat's favorite status.
 * @param props.chat The chat to toggle.
 * @param props.chats The chat manager object.
 * @param props.setCurrentChat The function to update the current chat.
 * @returns An action component.
 */
export const ToggleChatFavoriteAction = (props: {
  chat: Chat | undefined;
  chats: ChatManager;
  setCurrentChat: (value: React.SetStateAction<Chat | undefined>) => void;
  settings: typeof defaultAdvancedSettings;
}) => {
  const { chat, chats, setCurrentChat, settings } = props;

  if (!chat) {
    return null;
  }

  return (
    <Action
      title={chat.favorited ? "Remove From Favorites" : "Add To Favorites"}
      icon={chat.favorited ? Icon.StarDisabled : Icon.Star}
      shortcut={getActionShortcut("ToggleChatFavoriteAction", settings)}
      onAction={async () => {
        if (chat) {
          const newChatData = { ...chat, favorited: !chat.favorited };
          chats.updateChat(chat.name, newChatData);
          chats.revalidate();
          setCurrentChat(newChatData);
        }
      }}
    />
  );
};
