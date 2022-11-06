import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import MessageListItem from "./MessageListItem";
import useEmail from "./useEmail";

export default function Command() {
  const { email, inbox, disposeEmail, getMessageBody, deleteMessage, markAsUnread } = useEmail();

  return (
    <List
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy email" content={email} />
          <Action
            icon={{ source: Icon.Logout, tintColor: Color.Yellow }}
            title="Dispose & Create new email"
            onAction={() => void disposeEmail()}
          />
        </ActionPanel>
      }
      isShowingDetail={!!inbox.length}
      throttle
      isLoading={!email}
      navigationTitle={email ? `🟢 ${email}` : "🟠 Loading..."}
      searchBarPlaceholder="Search email..."
    >
      <List.EmptyView icon="📭" title="Inbox is empty" description={`Send an email to ${email}`} />

      <List.Section title={`Inbox (${inbox.length})`}>
        {inbox.map((msg) => (
          <MessageListItem
            key={msg.id}
            message={msg}
            email={email}
            disposeEmail={disposeEmail}
            deleteMessage={deleteMessage}
            markAsUnread={markAsUnread}
            getMessageBody={getMessageBody}
          />
        ))}
      </List.Section>
    </List>
  );
}
