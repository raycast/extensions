import { Action, ActionPanel, Form } from "@raycast/api";
import { TenantConfiguration } from "../TenantConfiguration";
import { useState } from "react";

export type TenantConfigurationFormProps = {
  tenant?: TenantConfiguration;
  onSubmit: (tenant: TenantConfiguration) => Promise<void> | void | undefined;
};

const emptyTenant: TenantConfiguration = { name: "", subdomain: "", apiKey: "" };

export default function TenantConfigurationForm({ tenant = emptyTenant, onSubmit }: TenantConfigurationFormProps) {
  const { name, subdomain, apiKey } = tenant;

  const [nameError, setNameError] = useState<string | undefined>();
  const [subdomainError, setSubdomainError] = useState<string | undefined>();
  const [apiKeyError, setApiKeyError] = useState<string | undefined>();

  const unsetNameError = () => setNameError(undefined);
  const unsetSubdomainError = () => setSubdomainError(undefined);
  const unsetApiKeyError = () => setApiKeyError(undefined);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={(tenant: TenantConfiguration) => onSubmit(tenant)} />
        </ActionPanel>
      }
    >
      <Form.Description text="Add a new tenant here. The name should be unique." />
      <Form.TextField
        id="name"
        title="Name"
        error={nameError}
        onChange={unsetNameError}
        onBlur={(event) => event.target.value?.length === 0 && setNameError("Name is required.")}
        defaultValue={name}
      />
      <Form.TextField
        id="subdomain"
        title="Subdomain"
        error={subdomainError}
        onChange={unsetSubdomainError}
        onBlur={(event) => event.target.value?.length === 0 && setSubdomainError("Subdomain is required.")}
        defaultValue={subdomain}
      />
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        error={apiKeyError}
        onChange={unsetApiKeyError}
        onBlur={(event) => event.target.value?.length === 0 && setApiKeyError("API Key is required.")}
        defaultValue={apiKey}
      />
    </Form>
  );
}
