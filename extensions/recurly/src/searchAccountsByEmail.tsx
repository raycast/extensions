import React, { useState } from "react";
import { TenantConfiguration } from "./TenantConfiguration";
import useTenants from "./hooks/useTenants";
import { List } from "@raycast/api";
import NoTenantsItem from "./components/NoTenantsItem";
import useRecurly, { UseRecurly } from "./hooks/useRecurly";
import useRecurlyAccounts from "./hooks/useRecurlyAccounts";
import { Account } from "recurly";
import AccountItem from "./components/AccountItem";

// noinspection JSUnusedGlobalSymbols
export default function searchAccountsByEmail() {
  const [query, setQuery] = useState<string>("");
  const [tenant, setTenant] = useState<TenantConfiguration>({ name: "", subdomain: "", apiKey: "" });
  const { tenants, tenantsLoading } = useTenants();
  const recurly = useRecurly(tenant);
  const { accounts, accountsLoading } = useRecurlyAccounts(recurly, query);

  const onSelectTenant = (name: string) => {
    const found = tenants.find((tenant) => tenant.name === name);

    if (found) setTenant(found);
  };

  return (
    <List
      isLoading={tenantsLoading || accountsLoading}
      searchBarPlaceholder="Search by email"
      onSearchTextChange={setQuery}
      searchBarAccessory={
        <List.Dropdown tooltip="Select the tenant" onChange={onSelectTenant} storeValue>
          {tenants.map((tenant) => (
            <List.Dropdown.Item key={tenant.name} title={tenant.name} value={tenant.name} />
          ))}
        </List.Dropdown>
      }
      isShowingDetail={accounts.length > 0}
      throttle
    >
      {showItems(tenant, recurly, accounts)}
    </List>
  );
}

const showItems = (tenant: TenantConfiguration, recurly: UseRecurly, accounts: Account[]) => {
  if (tenant.name === "") {
    return <NoTenantsItem />;
  }

  if (accounts.length === 0) {
    return <List.EmptyView title="No Results" />;
  }

  return accounts.map((account) => (
    <AccountItem key={account.id} recurly={recurly} tenant={tenant} account={account} />
  ));
};
