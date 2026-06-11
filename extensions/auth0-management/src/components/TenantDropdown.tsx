import { List } from "@raycast/api";
import { Tenant } from "../utils/types";

interface TenantDropdownProps {
  tenantId: string;
  tenants: Tenant[];
  onTenantChange: (id: string) => void;
}

/** Shared tenant-switching dropdown for use as a List searchBarAccessory. */
export default function TenantDropdown({ tenantId, tenants, onTenantChange }: TenantDropdownProps) {
  return (
    <List.Dropdown tooltip="Switch Tenant" value={tenantId} onChange={onTenantChange}>
      {tenants.map((t) => (
        <List.Dropdown.Item key={t.id} title={`${t.name + " " + t.environment || "not configured"}`} value={t.id} />
      ))}
    </List.Dropdown>
  );
}
