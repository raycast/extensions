import { Action, ActionPanel, List, useNavigation } from "@raycast/api";
import TenantConfigurationForm from "./components/TenantConfigurationForm";
import useTenants from "./hooks/useTenants";
import showError from "./showError";
import { TenantConfiguration } from "./TenantConfiguration";

// noinspection JSUnusedGlobalSymbols
export default function TenantsConfiguration() {
  const { tenantsLoading, tenants, createTenant, editTenant, deleteTenant } = useTenants();
  const { pop } = useNavigation();

  const onCreateTenant = (tenant: TenantConfiguration) => createTenant(tenant).then(pop).catch(showError);

  const onEditTenant = (current: TenantConfiguration) => (updated: TenantConfiguration) =>
    editTenant(current, updated).then(pop).catch(showError);

  const onDeleteTenant = (tenant: TenantConfiguration) => () => deleteTenant(tenant).catch(showError);

  return (
    <List isLoading={tenantsLoading}>
      <TenantsListSection tenants={tenants} onEditTenant={onEditTenant} onDeleteTenant={onDeleteTenant} />
      <AddTenantSection onCreateTenant={onCreateTenant} />
    </List>
  );
}

const TenantsListSection = ({
  tenants,
  onEditTenant,
  onDeleteTenant,
}: {
  tenants: TenantConfiguration[];
  onEditTenant: (t: TenantConfiguration) => (t: TenantConfiguration) => Promise<void>;
  onDeleteTenant: (t: TenantConfiguration) => () => Promise<void>;
}) => (
  <List.Section>
    {tenants.map((tenant) => (
      <List.Item
        key={tenant.name}
        title={tenant.name}
        actions={
          <ActionPanel>
            <Action.Push
              title="Edit Tenant"
              target={<TenantConfigurationForm tenant={tenant} onSubmit={onEditTenant(tenant)} />}
            />
            <Action.SubmitForm title="Delete tenant" onSubmit={onDeleteTenant(tenant)} />
          </ActionPanel>
        }
      />
    ))}
  </List.Section>
);

const AddTenantSection = ({ onCreateTenant }: { onCreateTenant: (t: TenantConfiguration) => Promise<void> }) => (
  <List.Section title="—">
    <List.Item
      title="Add new item"
      actions={
        <ActionPanel>
          <Action.Push title={"Add Tenant"} target={<TenantConfigurationForm onSubmit={onCreateTenant} />} />
        </ActionPanel>
      }
    />
  </List.Section>
);
