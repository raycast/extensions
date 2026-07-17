import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { TenantConfig } from "../utils/types";

interface CreateOrgFormValues {
  name: string;
  display_name: string;
}

interface CreateOrgFormProps {
  tenant: TenantConfig;
  onSubmit: (values: { name: string; display_name?: string }) => Promise<void>;
}

/** Form for creating a new Auth0 organization. */
export default function CreateOrgForm({ tenant, onSubmit }: CreateOrgFormProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<CreateOrgFormValues>({
    onSubmit: async (values) => {
      await onSubmit({ name: values.name, display_name: values.display_name || undefined });
      pop();
    },
    validation: {
      name: (value) => {
        if (!value) return "Required";
        if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(value) && value.length > 1)
          return "Lowercase alphanumeric and hyphens only";
        if (value.length < 2) return "At least 2 characters";
      },
    },
  });

  return (
    <Form
      navigationTitle={`Create Organization — ${tenant.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Organization" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        placeholder="acme-corp"
        info="Lowercase alphanumeric and hyphens only"
        {...itemProps.name}
      />
      <Form.TextField title="Display Name" placeholder="ACME Corporation (optional)" {...itemProps.display_name} />
    </Form>
  );
}
