import {Action, ActionPanel, List } from "@raycast/api";
import {Account} from "recurly";
import AccountDetail, {formatSubscriptionEmoji} from "./AccountDetail";
import {TenantConfiguration} from "../TenantConfiguration";

export default function AccountItem({tenant, account}: {tenant: TenantConfiguration, account: Account}) {
  return <List.Item
    icon={formatSubscriptionEmoji(account)}
    title={account.email || account.id || "no email"}
    detail={<AccountDetail account={account} />}
    actions={
      <ActionPanel>
        <Action.OpenInBrowser url={`https://${tenant.subdomain}.recurly.com/accounts/${account.code}`} />
      </ActionPanel>
    }
  />
}