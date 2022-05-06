import {Detail, List } from "@raycast/api";
import useTenants from "./hooks/useTenants";
import {useState} from "react";
import {TenantConfiguration} from "./TenantConfiguration";

export default function accountSearchByEmail() {
  const {tenants, tenantsLoading} = useTenants();
  const [tenant, setTenant] = useState<TenantConfiguration>({name: '', subdomain: '', apiKey: ''});

  return <List
    isLoading={tenantsLoading}
    throttle={true}
    searchBarAccessory={
      <List.Dropdown
        tooltip="Select the tenant"
        onChange={(name: string) => {
          const found = tenants.find(tenant => tenant.name === name);

          if (found) {
            setTenant(found);
          }
        }}
      >
        {tenants.map(tenant => <List.Dropdown.Item key={tenant.name} title={tenant.name} value={tenant.name} />)}
      </List.Dropdown>
    }
  >

  </List>
}