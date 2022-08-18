import { List, Icon, Color, Action, ActionPanel } from "@raycast/api";
import { Account } from "../types/types";
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
          <Action.Push title="See Mail" icon={"../assets/mail-icon.png"} target={<Messages {...account} />} />
        </ActionPanel>
      }
    />
  );
};
