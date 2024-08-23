import { Action, Icon, LaunchType, launchCommand } from "@raycast/api";

export const SendMessageAction: React.FC<{ handleSendMessageAction: () => void }> = ({ handleSendMessageAction }) => (
  <Action
    title="Send a Message"
    shortcut={{ modifiers: ["cmd"], key: "e" }}
    icon={Icon.Message}
    onAction={handleSendMessageAction}
  />
);

export const OpenChatHistoryCommandAction: React.FC = () => (
  <Action
    title="Open Chat History"
    shortcut={{ modifiers: ["cmd"], key: "h" }}
    icon={Icon.List}
    onAction={() => {
      launchCommand({ name: "chats", type: LaunchType.UserInitiated });
    }}
  />
);
