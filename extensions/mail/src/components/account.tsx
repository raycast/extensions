import { List, Icon, Action, ActionPanel, getPreferenceValues } from "@raycast/api";
import { Messages } from "./messages";
import { Mailboxes, MailIcons } from "../utils/presets";
import { Account, Mailbox } from "../types/types";

const { primaryMailbox } = getPreferenceValues();

export const MailAccount = (account: Account): JSX.Element => {
  return (
    <List.Item
      id={account.id}
      title={account.name}
      subtitle={account.email}
      icon={account.numUnread > 0 ? MailIcons.Unread : MailIcons.Read}
      accessories={[
        { text: account.fullName, icon: Icon.Person },
        {
          text:
            account.numUnread > 0
              ? `${account.numUnread} Unread Message${account.numUnread === 1 ? "" : "s"}`
              : "No Unread Messages",
        },
      ]}
      actions={
        <ActionPanel>
          <MailboxAction id={primaryMailbox} account={account} mailbox={Mailboxes[primaryMailbox]} />
          {Object.entries(Mailboxes)
            .filter(([id, mailbox]) => id !== primaryMailbox)
            .map(([id, mailbox], index) => (
              <MailboxAction key={index} id={id} account={account} mailbox={mailbox} />
            ))}
        </ActionPanel>
      }
    />
  );
};

const MailboxAction = (props: { id: string; account: Account; mailbox: Mailbox }) => {
  return (
    <Action.Push title={`See ${props.mailbox.title}`} icon={props.mailbox.icon} target={<Messages {...props} />} />
  );
};
