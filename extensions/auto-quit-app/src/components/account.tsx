import { List, Icon, Action, ActionPanel } from "@raycast/api";
import { Messages } from "./messages";
import { MailIcons } from "../utils/presets";
import { Account, Mailbox } from "../types";
import { titleCase } from "../utils";

export const MailAccount = (account: Account): JSX.Element => {
  const unreadMessages =
    account.numUnread === 0
      ? "No Unread Messages"
      : `${account.numUnread} Unread Message${account.numUnread === 1 ? "" : "s"}`;

  const MailboxAction = ({ mailbox }: { mailbox: Mailbox }) => {
    return (
      <Action.Push
        title={`See ${titleCase(mailbox.name)}`}
        icon={mailbox.icon}
        target={<Messages mailbox={mailbox} account={account} />}
      />
    );
  };

  return (
    <List.Item
      id={account.id}
      title={account.name}
      subtitle={account.email}
      icon={account.numUnread > 0 ? MailIcons.Unread : MailIcons.Read}
      accessories={[{ text: account.fullName, icon: Icon.PersonCircle }, { text: unreadMessages }]}
      actions={
        <ActionPanel>
          {account.mailboxes
            .sort((a, b) => b.unreadCount - a.unreadCount)
            .map((mailbox) => (
              <MailboxAction key={mailbox.name} mailbox={mailbox} />
            ))}
        </ActionPanel>
      }
    />
  );
};
