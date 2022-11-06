import { Action, ActionPanel, Color, Icon, List, showToast, Toast, ToastStyle } from "@raycast/api";
import MessageListItemDetail from "./MessageListItemDetail";
import { Message } from "./useEmail";

type Props = {
  message: Message;
  email: string;
  disposeEmail: () => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  markAsUnread: (id: string, seen: boolean) => Promise<void>;
  getMessageBody: (id: string) => Promise<string>;
};

const MessageListItem = ({ message, email, disposeEmail, getMessageBody, deleteMessage, markAsUnread }: Props) => (
  <List.Item
    key={message.id}
    title={message.subject}
    subtitle={message.intro}
    actions={
      <ActionPanel>
        <Action.CopyToClipboard title="Copy email" content={email} />
        <Action
          icon={{ source: Icon.Logout, tintColor: Color.Yellow }}
          title="Dispose & Create new email"
          onAction={() => void disposeEmail()}
        />
        <ActionPanel.Section title="Item Actions">
          <Action
            icon={{ source: Icon.Envelope, tintColor: Color.Blue }}
            title="Mark as Unread"
            shortcut={{ modifiers: ["cmd"], key: "u" }}
            onAction={async () => {
              await markAsUnread(message.id, false);
              showToast(Toast.Style.Success, "Message Marked as Unread");
            }}
          />
          <Action
            icon={{ source: Icon.Trash, tintColor: Color.Red }}
            title="Delete"
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={async () => {
              deleteMessage(message.id);
              showToast(Toast.Style.Success, "Message Deleted");
            }}
          />
        </ActionPanel.Section>
      </ActionPanel>
    }
    accessories={[
      !message.seen ? { icon: Icon.Envelope } : {},
      { icon: Icon.Person, tooltip: `${message.name}\n${message.email}` },
      { date: new Date(message.date) },
    ]}
    detail={<MessageListItemDetail getMessageBody={getMessageBody} message={message} />}
  />
);

export default MessageListItem;
