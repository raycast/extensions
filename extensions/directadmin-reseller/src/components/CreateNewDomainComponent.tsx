import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { CreateNewDomainFormValues, SuccessResponse } from "../types";
import { createDomain } from "../utils/api";
import { RESELLER_USERNAME } from "../utils/constants";

type CreateNewDomainProps = {
  onDomainCreated: () => void;
  userToImpersonate?: string;
};
export default function CreateNewDomainComponent({ onDomainCreated, userToImpersonate = "" }: CreateNewDomainProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<CreateNewDomainFormValues>({
    async onSubmit(values) {
      const params = values;
      if (!values.ubandwidth) delete params.ubandwidth;
      if (!values.uquota) delete params.uquota;

      const ssl = params.ssl ? "ON" : "OFF";
      const cgi = params.cgi ? "ON" : "OFF";
      const php = params.php ? "ON" : "OFF";

      const response = await createDomain({ ...params, ssl, cgi, php, action: "create" }, userToImpersonate);

      if (response.error === "0") {
        const data = response as SuccessResponse;
        await showToast(Toast.Style.Success, data.text, data.details);
        onDomainCreated();
        pop();
      }
    },
    validation: {
      domain: FormValidation.Required,
      bandwidth(value) {
        if (!itemProps.ubandwidth.value && !value) return "The item is required";
      },
      quota(value) {
        if (!itemProps.uquota.value && !value) return "The item is required";
      },
    },
  });

  return (
    <Form
      navigationTitle="Create New Domain"
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.Description title="User" text={userToImpersonate || RESELLER_USERNAME} />
      <Form.TextField title="Domain" placeholder="example.com" {...itemProps.domain} />
      <Form.TextField title="Bandwidth (MB)" placeholder="1024" {...itemProps.bandwidth} />
      <Form.Checkbox label="Unlimited Bandwidth" {...itemProps.ubandwidth} />
      <Form.TextField title="Quota (MB)" placeholder="1024" {...itemProps.quota} />
      <Form.Checkbox label="Unlimited Quota" {...itemProps.uquota} />
      <Form.Separator />
      <Form.Checkbox label="SSL" {...itemProps.ssl} />
      <Form.Checkbox label="CGI" {...itemProps.cgi} />
      <Form.Checkbox label="PHP" {...itemProps.php} />
    </Form>
  );
}
