import { List, Icon, Action, ActionPanel } from "@raycast/api";

import { MessageList } from "./message-list";
import { Account, Mailbox } from "../types";
import { titleCase } from "../utils";
import { MailIcon } from "../utils/presets";

export type MailboxListProps = Account;

export const MailboxList = (props: MailboxListProps) => {
  const { id, name, fullName, email, mailboxes, numUnread } = props;

  const unreadMessages =
    numUnread === 0 ? "No Unread Messages" : `${numUnread} Unread Message${numUnread === 1 ? "" : "s"}`;

  return (
    <List.Item
      id={id}
      title={name}
      subtitle={email}
      icon={numUnread > 0 ? MailIcon.Unread : MailIcon.Read}
      accessories={[{ text: fullName, icon: Icon.PersonCircle }, { text: unreadMessages }]}
      actions={
        <ActionPanel>
          {mailboxes
            .sort((a, b) => b.unreadCount - a.unreadCount)
            .map((mailbox) => (
              <MailboxAction key={mailbox.name} account={props} mailbox={mailbox} />
            ))}
        </ActionPanel>
      }
    />
  );
};

type MailboxActionProps = {
  account: Account;
  mailbox: Mailbox;
};

const MailboxAction = ({ account, mailbox }: MailboxActionProps) => {
  return (
    <Action.Push
      title={`See ${titleCase(mailbox.name)}`}
      icon={mailbox.icon}
      target={<MessageList account={account} mailbox={mailbox} />}
    />
  );
};
