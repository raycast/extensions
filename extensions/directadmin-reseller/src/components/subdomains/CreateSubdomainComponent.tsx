import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { CreateSubdomainFormValues, SuccessResponse } from "../../types";
import { createSubdomain } from "../../utils/api";

type CreateSubdomainComponentProps = {
  domain: string;
  onSubdomainCreated: () => void;
  userToImpersonate?: string;
};
export default function CreateSubdomainComponent({
  domain,
  onSubdomainCreated,
  userToImpersonate = "",
}: CreateSubdomainComponentProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<CreateSubdomainFormValues>({
    async onSubmit(values) {
      const { subdomain } = values;
      const response = await createSubdomain({ subdomain, domain, action: "create" }, userToImpersonate);

      if (response.error === "0") {
        const data = response as SuccessResponse;
        await showToast(Toast.Style.Success, data.text, data.details);
        onSubdomainCreated();
        pop();
      }
    },
    validation: {
      subdomain: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle="Create Subdomain"
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.Description title="Domain" text={domain} />
      <Form.TextField title="Subdomain" placeholder="dash" {...itemProps.subdomain} />
      <Form.Description text={`${itemProps.subdomain.value || "[SUBDOMAIN]"}.${domain}`} />
    </Form>
  );
}
