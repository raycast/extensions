import { List, ActionPanel, Action, Icon, Color, confirmAlert, Alert, showToast, Toast, popToRoot } from "@raycast/api";
import { useActiveTenant } from "./utils/use-active-tenant";
import { addTenant, updateTenant, deleteTenant, isTenantConfigured } from "./utils/tenant-storage";
import { Environment, Tenant } from "./utils/types";
import TenantForm from "./components/TenantForm";

/** Raycast command: view, add, edit, delete, and switch between Auth0 tenants. */
export default function SwitchTenant() {
  const { tenantId, tenants, switchTenant, loadTenants, isLoading } = useActiveTenant();

  const handleAdd = async (values: {
    name: string;
    environment: string;
    domain: string;
    clientId: string;
    clientSecret: string;
  }) => {
    await addTenant({ ...values, environment: values.environment as Environment });
    await loadTenants();
    showToast({ style: Toast.Style.Success, title: "Tenant Added", message: values.name });
  };

  const handleEdit =
    (tenant: Tenant) =>
    async (values: { name: string; environment: string; domain: string; clientId: string; clientSecret: string }) => {
      await updateTenant(tenant.id, { ...values, environment: values.environment as Environment });
      await loadTenants();
      showToast({ style: Toast.Style.Success, title: "Tenant Updated", message: values.name });
    };

  const handleDelete = async (tenant: Tenant) => {
    const confirmed = await confirmAlert({
      title: `Delete ${tenant.name}?`,
      message: "This will remove the tenant and its credentials.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await deleteTenant(tenant.id);
    await loadTenants();
    showToast({ style: Toast.Style.Success, title: "Tenant Deleted", message: tenant.name });
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Switch Tenant"
      actions={
        <ActionPanel>
          <Action.Push
            title="Add Tenant"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            target={<TenantForm onSubmit={handleAdd} />}
          />
        </ActionPanel>
      }
    >
      {tenants.length === 0 && !isLoading && (
        <List.EmptyView icon={Icon.Building} title="No Tenants" description="Press Cmd+N to add your first tenant" />
      )}
      {tenants.map((tenant) => {
        const isActive = tenant.id === tenantId;
        const configured = isTenantConfigured(tenant);

        return (
          <List.Item
            key={tenant.id}
            icon={
              isActive
                ? { source: Icon.CheckCircle, tintColor: tenant.color }
                : { source: Icon.Circle, tintColor: tenant.color }
            }
            title={tenant.name}
            subtitle={tenant.domain || "Not configured"}
            accessories={[
              tenant.environment
                ? {
                    tag: {
                      value: tenant.environment.charAt(0).toUpperCase() + tenant.environment.slice(1),
                      color: Color.SecondaryText,
                    },
                  }
                : {},
              isActive ? { tag: { value: "Active", color: tenant.color } } : {},
              configured
                ? { icon: { source: Icon.Check, tintColor: Color.Green }, tooltip: "Configured" }
                : { icon: { source: Icon.Xmark, tintColor: Color.SecondaryText }, tooltip: "Not configured" },
            ]}
            actions={
              <ActionPanel>
                {!isActive && configured && (
                  <Action
                    title={`Switch to ${tenant.name}`}
                    icon={Icon.Switch}
                    onAction={() => {
                      switchTenant(tenant.id);
                      popToRoot();
                    }}
                  />
                )}
                <Action.Push
                  title="Edit Tenant"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={<TenantForm tenant={tenant} onSubmit={handleEdit(tenant)} />}
                />
                <Action
                  title="Delete Tenant"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleDelete(tenant)}
                />
                <Action.Push
                  title="Add Tenant"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<TenantForm onSubmit={handleAdd} />}
                />
                {tenant.domain && (
                  <Action.CopyToClipboard
                    title="Copy Domain"
                    content={tenant.domain}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
