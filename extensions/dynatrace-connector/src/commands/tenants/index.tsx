// src/commands/tenants/index.tsx
// Manage Tenants command — list, add, edit and delete Dynatrace tenant configs.

import { List, ActionPanel, Action, Icon, Alert, confirmAlert, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { listTenants, deleteTenant, setActiveTenant, getActiveTenant } from "../../lib/tenants";
import { validateTenantCredentials } from "../../lib/auth";
import type { TenantConfig } from "../../lib/auth";
import TenantForm from "./tenant-form";

interface TenantStatus {
  tenantId: string;
  isValid: boolean;
  error?: string;
}

export default function Command() {
  const { push } = useNavigation();
  const [tenants, setTenants] = useState<TenantConfig[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMap, setStatusMap] = useState<Record<string, TenantStatus>>({});

  async function checkTenantStatus(tenant: TenantConfig) {
    try {
      const validation = await validateTenantCredentials(tenant);
      return {
        tenantId: tenant.id,
        isValid: validation.valid,
        error: !validation.valid ? validation.error : undefined,
      } as TenantStatus;
    } catch {
      return {
        tenantId: tenant.id,
        isValid: false,
        error: "Connection check failed",
      } as TenantStatus;
    }
  }

  async function reload() {
    setIsLoading(true);
    const [all, active] = await Promise.all([listTenants(), getActiveTenant()]);
    setTenants(all);
    setActiveTenantId(active?.id ?? null);

    // Check status for all tenants in parallel
    const statuses = await Promise.all(all.map((tenant) => checkTenantStatus(tenant)));
    const statusRecord = statuses.reduce(
      (acc, status) => {
        acc[status.tenantId] = status;
        return acc;
      },
      {} as Record<string, TenantStatus>,
    );
    setStatusMap(statusRecord);
    setIsLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleSetActive(tenant: TenantConfig) {
    await setActiveTenant(tenant.id);
    setActiveTenantId(tenant.id);
    await showToast({ style: Toast.Style.Success, title: `Active tenant: ${tenant.name}` });
  }

  async function handleDelete(tenant: TenantConfig) {
    const confirmed = await confirmAlert({
      title: `Delete "${tenant.name}"?`,
      message: "This action cannot be undone.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await deleteTenant(tenant.id);
    await showToast({ style: Toast.Style.Success, title: `Deleted "${tenant.name}"` });
    reload();
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Manage Tenants"
      actions={
        <ActionPanel>
          <Action title="Add Tenant" icon={Icon.Plus} onAction={() => push(<TenantForm onSave={reload} />)} />
        </ActionPanel>
      }
    >
      {tenants.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Globe}
          title="No tenants configured"
          description="Press ↵ to add your first Dynatrace tenant."
          actions={
            <ActionPanel>
              <Action title="Add Tenant" icon={Icon.Plus} onAction={() => push(<TenantForm onSave={reload} />)} />
            </ActionPanel>
          }
        />
      )}
      {tenants.map((tenant) => {
        const isActive = tenant.id === activeTenantId;
        const status = statusMap[tenant.id];
        const statusIcon = status?.isValid ? Icon.CheckCircle : Icon.XMarkCircle;
        const statusTooltip = status?.isValid
          ? "✓ Connected"
          : `✗ Connection failed: ${status?.error || "Unknown error"}`;
        const statusColor = status?.isValid ? "#32A865" : "#FF5E00";

        const accessories: List.Item.Accessory[] = [];

        // Add status icon
        if (status) {
          accessories.push({
            icon: { source: statusIcon, tintColor: statusColor },
            tooltip: statusTooltip,
          });
        }

        // Add active indicator (star)
        if (isActive) {
          accessories.push({ icon: Icon.Star, tooltip: "Active tenant" });
        }

        return (
          <List.Item
            key={tenant.id}
            icon={Icon.Globe}
            title={tenant.name}
            subtitle={tenant.tenantEndpoint}
            accessories={accessories}
            actions={
              <ActionPanel>
                {!isActive && (
                  <Action title="Set as Active" icon={Icon.Checkmark} onAction={() => handleSetActive(tenant)} />
                )}
                <Action
                  title="Edit"
                  icon={Icon.Pencil}
                  onAction={() => push(<TenantForm existing={tenant} onSave={reload} />)}
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(tenant)}
                />
                <ActionPanel.Section>
                  <Action title="Add Tenant" icon={Icon.Plus} onAction={() => push(<TenantForm onSave={reload} />)} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
