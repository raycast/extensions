import { List, Icon, Color, Action, ActionPanel } from "@raycast/api";
import { Account } from "../types/types";
import { Messages } from "./messages";

export const MailAccount = (account: Account): JSX.Element => {
  return (
    <List.Item
      id={account.id}
      title={account.name}
      subtitle={account.email}
      icon={"../assets/mail-symbol.png"}
      accessories={[{ text: account.fullName, icon: Icon.Person }]}
      actions={
        <ActionPanel>
          <Action.Push title="See Mail" icon={"../assets/mail-icon.png"} target={<Messages {...account} />} />
        </ActionPanel>
      }
    />
  );
};
