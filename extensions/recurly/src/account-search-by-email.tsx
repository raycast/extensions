import {List} from "@raycast/api";
import useTenants from "./hooks/useTenants";
import {useState} from "react";
import {TenantConfiguration} from "./TenantConfiguration";
import useRecurly from "./hooks/useRecurly";
import useRecurlyAccounts from "./hooks/useRecurlyAccounts";
import AccountItem from "./components/AccountItem";

// noinspection JSUnusedGlobalSymbols
export default function accountSearchByEmail() {
  const [text, setText] = useState("");
  const {tenants, tenantsLoading} = useTenants();
  const [tenant, setTenant] = useState<TenantConfiguration>({name: '', subdomain: '', apiKey: ''});
  const recurly = useRecurly(tenant);
  const {accounts, accountsLoading} = useRecurlyAccounts(recurly, text);

  const onSelectTenant = (name: string) => {
    const found = tenants.find(tenant => tenant.name === name);

    if (found) setTenant(found);
  }

  return <List
    isLoading={tenantsLoading || accountsLoading}
    throttle={true}
    isShowingDetail={true}
    onSearchTextChange={setText}
    searchBarAccessory={
      <List.Dropdown tooltip="Select the tenant" onChange={onSelectTenant}>
        {tenants.map(tenant => <List.Dropdown.Item key={tenant.name} title={tenant.name} value={tenant.name}/>)}
      </List.Dropdown>
    }
  >
    {
      accounts.map(
        (account, idx) =>
          <AccountItem
            key={account.id || idx}
            recurly={recurly}
            tenant={tenant}
            account={account}
          />
      )
    }
  </List>
}