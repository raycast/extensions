import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { Tenant } from "../utils/types";

interface TenantFormValues {
  name: string;
  environment: string;
  domain: string;
  clientId: string;
  clientSecret: string;
}

interface TenantFormProps {
  tenant?: Tenant;
  onSubmit: (values: TenantFormValues) => Promise<void>;
}

/** Reusable form for creating or editing a tenant's name, environment, and credentials. */
export default function TenantForm({ tenant, onSubmit }: TenantFormProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<TenantFormValues>({
    onSubmit: async (values) => {
      await onSubmit(values);
      pop();
    },
    initialValues: tenant
      ? {
          name: tenant.name,
          environment: tenant.environment,
          domain: tenant.domain,
          clientId: tenant.clientId,
          clientSecret: tenant.clientSecret,
        }
      : { environment: "Dev" },
    validation: {
      name: FormValidation.Required,
      environment: FormValidation.Required,
      domain: FormValidation.Required,
      clientId: FormValidation.Required,
      clientSecret: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle={tenant ? `Edit ${tenant.name}` : "Add Tenant"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={tenant ? "Update Tenant" : "Add Tenant"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="e.g. Production" {...itemProps.name} />
      <Form.Dropdown title="Environment" {...itemProps.environment}>
        <Form.Dropdown.Item value="Dev" title="Dev" />
        <Form.Dropdown.Item value="Staging" title="Staging" />
        <Form.Dropdown.Item value="Prod" title="Prod" />
      </Form.Dropdown>
      <Form.TextField title="Domain" placeholder="e.g. myapp.auth0.com" {...itemProps.domain} />
      <Form.TextField title="Client ID" placeholder="Machine-to-machine app Client ID" {...itemProps.clientId} />
      <Form.PasswordField
        title="Client Secret"
        placeholder="Machine-to-machine app Client Secret"
        {...itemProps.clientSecret}
      />
    </Form>
  );
}
