import { List, Icon, Action, ActionPanel, showToast, Toast } from "@raycast/api";

import { MessageList } from "./message-list";
import { Account, Mailbox } from "../types";
import { titleCase } from "../utils";
import { MailIcon } from "../utils/presets";
import { sortMailboxes } from "../utils/mailbox";
import { Cache } from "../utils/cache";
import { useMemo } from "react";

export type MailboxListProps = Account;

export const MailboxList = (props: MailboxListProps) => {
  const { id, name, fullName, emails, mailboxes, numUnread } = props;
  const defaultAccount = Cache.getDefaultAccount();
  const isDefault = defaultAccount?.id === id;

  const unreadMessages =
    numUnread === 0 ? "No Unread Messages" : `${numUnread} Unread Message${numUnread === 1 ? "" : "s"}`;

  const sortedMailboxes = useMemo(() => mailboxes.toSorted(sortMailboxes), [mailboxes]);

  return (
    <List.Item
      id={id}
      title={name}
      subtitle={emails.join(", ")}
      icon={numUnread > 0 ? MailIcon.Unread : MailIcon.Read}
      accessories={[
        { text: fullName, icon: Icon.PersonCircle },
        { text: unreadMessages },
        ...(isDefault ? [{ text: "Default", icon: Icon.Star }] : []),
      ]}
      actions={
        <ActionPanel>
          {sortedMailboxes.map((mailbox) => (
            <MailboxAction key={mailbox.name} account={props} mailbox={mailbox} />
          ))}

          <Action
            title="Set as Default"
            icon={Icon.Star}
            onAction={() => {
              Cache.setDefaultAccount(id);
              showToast({ title: `Set ${name} as default`, style: Toast.Style.Success });
            }}
          />
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
