import { List } from "@raycast/api";
import {useState} from "react";
import useTenants from "../hooks/useTenants";
import {TenantConfiguration} from "../TenantConfiguration";
import NoTenantsItem from "./NoTenantsItem";
import CodeItem from "./CodeItem";

export default function PrepareCodeList() {
  const [code, setCode] = useState<string>("");
  const [tenant, setTenant] = useState<TenantConfiguration>({name: '', subdomain: '', apiKey: ''});
  const {tenants, tenantsLoading} = useTenants();

  const onSelectTenant = (name: string) => {
    const found = tenants.find(tenant => tenant.name === name);

    if (found) setTenant(found);
  }

  return <List
    isLoading={tenantsLoading}
    onSearchTextChange={setCode}
    searchBarAccessory={
      <List.Dropdown tooltip="Select the tenant" onChange={onSelectTenant}>
        {tenants.map(tenant => <List.Dropdown.Item key={tenant.name} title={tenant.name} value={tenant.name}/>)}
      </List.Dropdown>
    }
  >
    {tenants.length > 0 ? <CodeItem code={code} tenant={tenant}/> : <NoTenantsItem />}
  </List>
}
