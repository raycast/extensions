import React, { useState } from "react";
import { TenantConfiguration } from "./TenantConfiguration";
import useTenants from "./hooks/useTenants";
import useRecurly, { UseRecurly } from "./hooks/useRecurly";
import useRecurlyAccountByCode from "./hooks/useRecurlyAccountByCode";
import { List } from "@raycast/api";
import { Account } from "recurly";
import NoTenantsItem from "./components/NoTenantsItem";
import AccountItem from "./components/AccountItem";

// noinspection JSUnusedGlobalSymbols
export default function searchAccountByCode() {
  const [query, setQuery] = useState<string>("");
  const [tenant, setTenant] = useState<TenantConfiguration>({ name: "", subdomain: "", apiKey: "" });
  const { tenants, tenantsLoading } = useTenants();
  const recurly = useRecurly(tenant);
  const { account, accountLoading } = useRecurlyAccountByCode(recurly, query);

  const onSelectTenant = (name: string) => {
    const found = tenants.find((tenant) => tenant.name === name);

    if (found) setTenant(found);
  };

  return (
    <List
      isLoading={tenantsLoading || accountLoading}
      searchBarPlaceholder="Search by code"
      onSearchTextChange={setQuery}
      searchBarAccessory={
        <List.Dropdown tooltip="Select the tenant" onChange={onSelectTenant} storeValue>
          {tenants.map((tenant) => (
            <List.Dropdown.Item key={tenant.name} title={tenant.name} value={tenant.name} />
          ))}
        </List.Dropdown>
      }
      isShowingDetail={account !== null}
      throttle
    >
      {showFound(tenant, recurly, account)}
    </List>
  );
}

const showFound = (tenant: TenantConfiguration, recurly: UseRecurly, account: Account | null) => {
  if (tenant.name === "") {
    return <NoTenantsItem />;
  }

  if (account === null) {
    return <List.EmptyView title="No Results" />;
  }

  return <AccountItem key={account.id} recurly={recurly} tenant={tenant} account={account} />;
};
