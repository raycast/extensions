import { Action, ActionPanel, List } from "@raycast/api";
import { Account } from "recurly";
import AccountDetail, { formatSubscriptionEmoji } from "./AccountDetail";
import { TenantConfiguration } from "../TenantConfiguration";
import { UseRecurly } from "../hooks/useRecurly";
import AccountSubscriptionsList from "./AccountSubscriptionsList";

export type AccountItemProps = {
  recurly: UseRecurly;
  tenant: TenantConfiguration;
  account: Account;
};

export default function AccountItem({ recurly, tenant, account }: AccountItemProps) {
  return (
    <List.Item
      icon={formatSubscriptionEmoji(account)}
      title={account.email || account.id || "no email"}
      detail={<AccountDetail account={account} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://${tenant.subdomain}.recurly.com/accounts/${account.code}`} />
          <Action.Push
            title="List subscriptions"
            target={<AccountSubscriptionsList recurly={recurly} account={account} tenant={tenant} />}
          />
        </ActionPanel>
      }
    />
  );
}
