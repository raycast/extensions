import {TenantConfiguration} from "../TenantConfiguration";
import {Action, ActionPanel, List} from "@raycast/api";
import AccountsList from "./AccountsList";

export type EmailItemProps = {
  tenant: TenantConfiguration;
  email: string;
};

export default function EmailItem({tenant, email}: EmailItemProps) {
  return <List.Item
    title="Find By Email"
    subtitle={email ? `${email} ➡️` : 'Please start entering an email'}
    actions={
      <ActionPanel>
        {email.length > 0 && <Action.Push
          title="Find"
          target={<AccountsList tenant={tenant} email={email}/>}
        />}
      </ActionPanel>
    }
  />
}