import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { createEmailAccount } from "../../utils/api";
import { CreateEmailAccountFormValues } from "../../types/email-accounts";

type CreateEmailAccountProps = {
  initialDomain: string;
  onEmailAccountCreated: () => void;
};
export default function CreateEmailAccount({ initialDomain, onEmailAccountCreated }: CreateEmailAccountProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<CreateEmailAccountFormValues>({
    async onSubmit(values) {
      const response = await createEmailAccount({ ...values });
      if (response.error_message === "None") {
        await showToast(
          Toast.Style.Success,
          "SUCCESS",
          `Created Email Account '${values.username}@${values.domain}' successfully`,
        );
        onEmailAccountCreated();
        pop();
      }
    },
    initialValues: {
      domain: initialDomain,
    },
    validation: {
      domain: FormValidation.Required,
      username: FormValidation.Required,
      passwordByPass: FormValidation.Required,
    },
  });
  return (
    <Form
      navigationTitle="Create Email Account"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Domain" placeholder="example.local" {...itemProps.domain} />
      <Form.TextField title="Username" placeholder="example_user" {...itemProps.username} />
      <Form.PasswordField title="Password" placeholder="hunter2" {...itemProps.passwordByPass} />
    </Form>
  );
}
