import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { CreateDatabaseRequest, SuccessResponse } from "../../types";
import { createDatabase } from "../../utils/api";
import { RESELLER_USERNAME } from "../../utils/constants";

type CreateDatabaseComponentProps = {
  onDatabaseCreated: () => void;
  userToImpersonate?: string;
};
export default function CreateDatabaseComponent({
  onDatabaseCreated,
  userToImpersonate = "",
}: CreateDatabaseComponentProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<CreateDatabaseRequest>({
    async onSubmit(values) {
      const response = await createDatabase({ ...values, action: "create" }, userToImpersonate);

      if (response.error === "0") {
        const data = response as SuccessResponse;
        await showToast(Toast.Style.Success, data.text, data.details);
        onDatabaseCreated();
        pop();
      }
    },
    validation: {
      name: FormValidation.Required,
      user: FormValidation.Required,
      passwd(value) {
        if (!value) return "The item is required";
        else if (itemProps.passwd2.value && itemProps.passwd2.value !== value) return "Passwords do not match";
      },
      passwd2(value) {
        if (!value) return "The item is required";
        else if (itemProps.passwd.value && itemProps.passwd.value !== value) return "Passwords do not match";
      },
    },
  });

  return (
    <Form
      navigationTitle="Create Database"
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Database Name" placeholder="db" {...itemProps.name} />
      <Form.Description text={`${userToImpersonate || RESELLER_USERNAME}_${itemProps.name.value || ""}`} />
      <Form.TextField title="Database User" placeholder="user" {...itemProps.user} />
      <Form.Description text={`${userToImpersonate || RESELLER_USERNAME}_${itemProps.user.value || ""}`} />
      <Form.PasswordField title="Database Password" placeholder="hunter2" {...itemProps.passwd} />
      <Form.PasswordField title="Confirm Password" placeholder="hunter2" {...itemProps.passwd2} />
    </Form>
  );
}
