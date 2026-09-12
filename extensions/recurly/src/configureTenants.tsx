import { Action, ActionPanel, List, useNavigation } from "@raycast/api";
import TenantConfigurationForm from "./components/TenantConfigurationForm";
import useTenants from "./hooks/useTenants";
import showError from "./showError";
import { TenantConfiguration } from "./TenantConfiguration";

// noinspection JSUnusedGlobalSymbols
export default function configureTenants() {
  const { tenantsLoading, tenants, createTenant, editTenant, deleteTenant } = useTenants();
  const { pop } = useNavigation();

  const onCreateTenant = (tenant: TenantConfiguration) => createTenant(tenant).then(pop).catch(showError);

  const onEditTenant = (current: TenantConfiguration) => (updated: TenantConfiguration) =>
    editTenant(current, updated).then(pop).catch(showError);

  const onDeleteTenant = (tenant: TenantConfiguration) => () => deleteTenant(tenant).catch(showError);

  return (
    <List
      isLoading={tenantsLoading}
      actions={
        <ActionPanel>
          <AddTenantAction onCreate={onCreateTenant} />
        </ActionPanel>
      }
    >
      <TenantsListSection onCreate={onCreateTenant} list={tenants} onEdit={onEditTenant} onDelete={onDeleteTenant} />
    </List>
  );
}

const TenantsListSection = ({
  list,
  onCreate,
  onEdit,
  onDelete,
}: {
  list: TenantConfiguration[];
  onCreate: (t: TenantConfiguration) => Promise<void>;
  onEdit: (t: TenantConfiguration) => (t: TenantConfiguration) => Promise<void>;
  onDelete: (t: TenantConfiguration) => () => Promise<void>;
}) => (
  <List.Section>
    {list.map((tenant) => (
      <List.Item
        key={tenant.name}
        title={tenant.name}
        actions={
          <ActionPanel>
            <Action.Push
              title="Edit Tenant"
              target={<TenantConfigurationForm tenant={tenant} onSubmit={onEdit(tenant)} />}
            />
            <AddTenantAction onCreate={onCreate} />
            <Action.SubmitForm title="Delete tenant" onSubmit={onDelete(tenant)} />
          </ActionPanel>
        }
      />
    ))}
  </List.Section>
);

const AddTenantAction = ({ onCreate }: { onCreate: (t: TenantConfiguration) => Promise<void> }) => (
  <Action.Push
    title={"Add Tenant"}
    target={<TenantConfigurationForm onSubmit={onCreate} />}
    shortcut={{ key: "n", modifiers: ["cmd"] }}
  />
);
