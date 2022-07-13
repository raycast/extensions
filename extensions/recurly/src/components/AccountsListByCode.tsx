import { List } from "@raycast/api";
import { TenantConfiguration } from "../TenantConfiguration";
import useRecurly from "../hooks/useRecurly";
import AccountItem from "./AccountItem";
import useRecurlyAccountByCode from "../hooks/useRecurlyAccountByCode";

export type AccountsListByIDProps = {
  tenant: TenantConfiguration;
  code: string;
};

// noinspection JSUnusedGlobalSymbols
export default function AccountsListByCode({ tenant, code }: AccountsListByIDProps) {
  const recurly = useRecurly(tenant);
  const { account, accountLoading } = useRecurlyAccountByCode(recurly, code);

  return (
    <List isLoading={accountLoading} isShowingDetail={true}>
      {[account]
        .filter((account) => account !== null)
        .map(
          (account) => account && <AccountItem key={account.id} recurly={recurly} tenant={tenant} account={account} />
        )}
    </List>
  );
}
