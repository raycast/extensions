import { List } from "@raycast/api";
import {useState} from "react";
import useTenants from "../hooks/useTenants";
import {TenantConfiguration} from "../TenantConfiguration";
import EmailItem from "./EmailItem";
import NoTenantsItem from "./NoTenantsItem";

export default function PrepareEmailList() {
  const [email, setEmail] = useState<string>("");
  const [tenant, setTenant] = useState<TenantConfiguration>({name: '', subdomain: '', apiKey: ''});
  const {tenants, tenantsLoading} = useTenants();

  const onSelectTenant = (name: string) => {
    const found = tenants.find(tenant => tenant.name === name);

    if (found) setTenant(found);
  }

  return <List
    isLoading={tenantsLoading}
    onSearchTextChange={setEmail}
    searchBarAccessory={
      <List.Dropdown tooltip="Select the tenant" onChange={onSelectTenant}>
        {tenants.map(tenant => <List.Dropdown.Item key={tenant.name} title={tenant.name} value={tenant.name}/>)}
      </List.Dropdown>
    }
  >
    {tenants.length > 0 ? <EmailItem email={email} tenant={tenant}/> : <NoTenantsItem />}
  </List>
}
