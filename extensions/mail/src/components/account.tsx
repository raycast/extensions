import { List, Icon, Action, ActionPanel, getPreferenceValues } from "@raycast/api";
import { Messages } from "./messages";
import { Mailboxes, MailIcons } from "../utils/presets";
import { Account, Mailbox, Preferences } from "../types/types";

const { primaryMailbox }: Preferences = getPreferenceValues();

export const MailAccount = (account: Account): JSX.Element => {
  const unreadMessages =
    account.numUnread === 0
      ? "No Unread Messages"
      : `${account.numUnread} Unread Message${account.numUnread === 1 ? "" : "s"}`;

  const MailboxAction = ({ id, mailbox }: { id: string; mailbox: Mailbox }) => {
    return (
      <Action.Push
        title={`See ${mailbox.title}`}
        icon={mailbox.icon}
        target={<Messages mailbox={id} account={account} />}
      />
    );
  };

  return (
    <List.Item
      id={account.id}
      title={account.name}
      subtitle={account.email}
      icon={account.numUnread > 0 ? MailIcons.Unread : MailIcons.Read}
      accessories={[{ text: account.fullName, icon: Icon.Person }, { text: unreadMessages }]}
      actions={
        <ActionPanel>
          <MailboxAction id={primaryMailbox} mailbox={Mailboxes[primaryMailbox]} />
          {Object.entries(Mailboxes)
            .filter(([id, mailbox]) => id !== primaryMailbox)
            .map(([id, mailbox]) => (
              <MailboxAction key={id} id={id} mailbox={mailbox} />
            ))}
        </ActionPanel>
      }
    />
  );
};
