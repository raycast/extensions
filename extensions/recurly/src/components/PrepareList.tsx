import React, { useState } from "react";
import { TenantConfiguration } from "../TenantConfiguration";
import useTenants from "../hooks/useTenants";
import { List } from "@raycast/api";
import NoTenantsItem from "./NoTenantsItem";

export type PrepareListProps = {
  Item: (props: ItemProps) => JSX.Element;
};

export type ItemProps = {
  query: string;
  tenant: TenantConfiguration;
};

// noinspection JSUnusedGlobalSymbols
export default function PrepareList({ Item }: PrepareListProps) {
  const [query, setQuery] = useState<string>("");
  const [tenant, setTenant] = useState<TenantConfiguration>({ name: "", subdomain: "", apiKey: "" });
  const { tenants, tenantsLoading } = useTenants();

  const onSelectTenant = (name: string) => {
    const found = tenants.find((tenant) => tenant.name === name);

    if (found) setTenant(found);
  };

  return (
    <List
      isLoading={tenantsLoading}
      onSearchTextChange={setQuery}
      searchBarAccessory={
        <List.Dropdown tooltip="Select the tenant" onChange={onSelectTenant}>
          {tenants.map((tenant) => (
            <List.Dropdown.Item key={tenant.name} title={tenant.name} value={tenant.name} />
          ))}
        </List.Dropdown>
      }
    >
      {tenants.length > 0 ? <Item tenant={tenant} query={query} /> : <NoTenantsItem />}
    </List>
  );
}
