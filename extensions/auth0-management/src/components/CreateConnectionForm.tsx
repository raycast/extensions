import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { TenantConfig } from "../utils/types";

export interface CreateConnectionValues {
  name: string;
  display_name?: string;
  identifier?: string;
  authMethod: string;
  customDatabase: boolean;
  enableSignup: boolean;
  domainConnection: boolean;
}

interface CreateConnectionFormProps {
  tenant: TenantConfig;
  onSubmit: (values: CreateConnectionValues) => Promise<void>;
}

interface CreateConnectionFormFields {
  name: string;
  display_name: string;
  identifier: string;
  authMethod: string;
  customDatabase: boolean;
  enableSignup: boolean;
  domainConnection: boolean;
}

/** Form for creating a new Auth0 database connection. */
export default function CreateConnectionForm({ tenant, onSubmit }: CreateConnectionFormProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<CreateConnectionFormFields>({
    onSubmit: async (values) => {
      await onSubmit({
        name: values.name,
        display_name: values.display_name || undefined,
        identifier: values.identifier || undefined,
        authMethod: values.authMethod,
        customDatabase: values.customDatabase,
        enableSignup: values.enableSignup,
        domainConnection: values.domainConnection,
      });
      pop();
    },
    initialValues: {
      authMethod: "password",
      enableSignup: true,
    },
    validation: {
      name: (value) => {
        if (!value) return "Required";
        if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(value)) return "Alphanumeric and hyphens only";
        if (value.length < 2) return "At least 2 characters";
      },
    },
  });

  return (
    <Form
      navigationTitle={`Create Database — ${tenant.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Database" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="my-database" info="Alphanumeric and hyphens only" {...itemProps.name} />
      <Form.TextField title="Display Name" placeholder="My Database (optional)" {...itemProps.display_name} />
      <Form.TextField
        title="Identifier"
        placeholder="e.g. urn:mydb or https://mydb.example.com (optional)"
        info="A logical identifier for this database"
        {...itemProps.identifier}
      />
      <Form.Separator />
      <Form.Dropdown title="Authentication Method" {...itemProps.authMethod}>
        <Form.Dropdown.Item value="password" title="Username & Password" />
        <Form.Dropdown.Item value="passkey" title="Passkey" />
        <Form.Dropdown.Item value="both" title="Username & Password + Passkey" />
      </Form.Dropdown>
      <Form.Checkbox label="Use Own Database" info="Enable custom database scripts" {...itemProps.customDatabase} />
      <Form.Checkbox
        label="Enable Sign-ups"
        info="Allow users to register via this connection"
        {...itemProps.enableSignup}
      />
      <Form.Checkbox
        label="Promote to Domain Level"
        info="Make this a domain-level connection"
        {...itemProps.domainConnection}
      />
    </Form>
  );
}
