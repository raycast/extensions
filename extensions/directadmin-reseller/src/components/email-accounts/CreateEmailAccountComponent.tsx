import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { CreateEmailAccountFormValues, CreateEmailAccountRequest, SuccessResponse } from "../../types";
import { createEmailAccount } from "../../utils/api";

type CreateEmailAccountComponentProps = {
  domain: string;
  onEmailAccountCreated: () => void;
  userToImpersonate?: string;
};
export default function CreateEmailAccountComponent({
  domain,
  onEmailAccountCreated,
  userToImpersonate = "",
}: CreateEmailAccountComponentProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<CreateEmailAccountFormValues>({
    async onSubmit(values) {
      const body = {
        ...values,
        quota: Number(values.quota),
        limit: Number(values.limit),
        action: "create",
        domain,
      } as CreateEmailAccountRequest;
      if (!values.limit) delete body.limit;

      const response = await createEmailAccount(body, userToImpersonate);

      if (response.error === "0") {
        const data = response as SuccessResponse;
        await showToast(Toast.Style.Success, data.text, data.details);
        onEmailAccountCreated();
        pop();
      }
    },
    validation: {
      user: FormValidation.Required,
      passwd(value) {
        if (!value) return "The item is required";
        else if (itemProps.passwd2.value && itemProps.passwd2.value !== value) return "Passwords do not match";
      },
      passwd2(value) {
        if (!value) return "The item is required";
        else if (itemProps.passwd.value && itemProps.passwd.value !== value) return "Passwords do not match";
      },
      quota(value) {
        if (!value) return "The item is required";
        else if ((!Number(value) && value !== "0") || Number(value) < 0) return "The item must be a number > -1";
      },
      limit(value) {
        if (value) if ((!Number(value) && value !== "0") || Number(value) < 0) return "The item must be a number > -1";
      },
    },
  });

  return (
    <Form
      navigationTitle="Create Email Account"
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.Description title="Domain" text={domain} />
      <Form.TextField title="User" placeholder="user" {...itemProps.user} />
      <Form.PasswordField title="Password" placeholder="hunter2" {...itemProps.passwd} />
      <Form.PasswordField title="Repeat Password" placeholder="hunter2" {...itemProps.passwd2} />
      <Form.TextField title="Quota (MB)" placeholder="0 = Unlimited" {...itemProps.quota} />
      <Form.TextField title="Limit" placeholder="0 = Unlimited | Blank for Default" {...itemProps.limit} />
    </Form>
  );
}
