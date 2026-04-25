// src/components/TenantSwitcher.tsx
// List.Dropdown component for switching the active Dynatrace tenant.
// Intended for use as searchBarAccessory in list commands.

import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { listTenants } from "../lib/tenants";
import type { TenantConfig } from "../lib/auth";

interface Props {
  value: string;
  onChange: (id: string) => void;
}

export default function TenantSwitcher({ value, onChange }: Props) {
  const [tenants, setTenants] = useState<TenantConfig[]>([]);

  useEffect(() => {
    listTenants().then(setTenants);
  }, []);

  if (tenants.length < 2) return null;

  return (
    <List.Dropdown tooltip="Switch Tenant" value={value} onChange={onChange}>
      {tenants.map((t) => (
        <List.Dropdown.Item key={t.id} title={t.name} value={t.id} />
      ))}
    </List.Dropdown>
  );
}
