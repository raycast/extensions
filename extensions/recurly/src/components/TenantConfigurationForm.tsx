import { Action, ActionPanel, Form } from "@raycast/api";
import { TenantConfiguration } from "../TenantConfiguration";

export type TenantConfigurationFormProps = {
  tenant?: TenantConfiguration;
  onSubmit: (tenant: TenantConfiguration) => Promise<void> | void | undefined;
};

const emptyTenant: TenantConfiguration = { name: "", subdomain: "", apiKey: "" };

export default function TenantConfigurationForm({ tenant = emptyTenant, onSubmit }: TenantConfigurationFormProps) {
  const { name, subdomain, apiKey } = tenant;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={(tenant: TenantConfiguration) => onSubmit(tenant)} />
        </ActionPanel>
      }
    >
      <Form.Description text="Add a new tenant here. The name should be unique." />
      <Form.TextField id="name" title="Name" defaultValue={name} />
      <Form.TextField id="subdomain" title="Subdomain" defaultValue={subdomain} />
      <Form.PasswordField id="apiKey" title="API Key" defaultValue={apiKey} />
    </Form>
  );
}
