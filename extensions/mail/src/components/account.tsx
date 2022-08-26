import { List, Icon, Action, ActionPanel } from "@raycast/api";
import { Account, Mailboxes } from "../types/types";
import { Messages } from "./messages";

export const MailAccount = (account: Account): JSX.Element => {
  return (
    <List.Item
      id={account.id}
      title={account.name}
      subtitle={account.email}
      icon={
        account.numUnread > 0
          ? {
              source: Icon.CircleProgress100,
              tintColor: "#0984ff",
            }
          : {
              source: Icon.CheckCircle,
              tintColor: "#a7a7a7",
            }
      }
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
          {Object.entries(Mailboxes).map(([id, mailbox], index) => (
            <Action.Push
              key={index}
              title={`See ${mailbox.title}`}
              icon={mailbox.icon}
              target={<Messages id={id} account={account} />}
            />
          ))}
        </ActionPanel>
      }
    />
  );
};
