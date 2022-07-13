import { List } from "@raycast/api";
import { TenantConfiguration } from "../TenantConfiguration";
import useRecurly from "../hooks/useRecurly";
import useRecurlyAccounts from "../hooks/useRecurlyAccounts";
import AccountItem from "./AccountItem";

export type AccountsListProps = {
  tenant: TenantConfiguration;
  email: string;
};

export default function AccountsListByEmail({ tenant, email }: AccountsListProps) {
  const recurly = useRecurly(tenant);
  const { accounts, accountsLoading } = useRecurlyAccounts(recurly, email);

  return (
    <List isLoading={accountsLoading} isShowingDetail={true}>
      {accounts.map((account) => (
        <AccountItem key={account.id} recurly={recurly} tenant={tenant} account={account} />
      ))}
    </List>
  );
}
