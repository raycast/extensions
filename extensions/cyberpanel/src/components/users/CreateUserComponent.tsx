import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { CreateUserFormValues } from "../../types/users";
import { createUser } from "../../utils/api";

type CreateUserProps = {
  onUserCreated: () => void;
};
export default function CreateUser({ onUserCreated }: CreateUserProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<CreateUserFormValues>({
    async onSubmit(values) {
      const response = await createUser({ ...values, websitesLimit: Number(values.websitesLimit) });
      if (response.error_message === "None") {
        await showToast(Toast.Style.Success, "SUCCESS", `Created ${values.userName} successfully`);
        onUserCreated();
        pop();
      }
    },
    validation: {
      firstName: FormValidation.Required,
      lastName: FormValidation.Required,
      email: FormValidation.Required,
      userName: FormValidation.Required,
      password: FormValidation.Required,
      websitesLimit(value) {
        if (!value) return "The item is required";
        else if (!Number(value)) return "The item must be a number";
      },
      selectedACL: FormValidation.Required,
    },
  });
  return (
    <Form
      navigationTitle="Create User"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextField title="First Name" placeholder="Raycast" {...itemProps.firstName} />
      <Form.TextField title="Last Name" placeholder="User" {...itemProps.lastName} />
      <Form.TextField title="Email" placeholder="user@raycast.local" {...itemProps.email} />
      <Form.TextField title="Username" placeholder="raycast" {...itemProps.userName} />
      <Form.PasswordField title="Password" placeholder="hunter2" {...itemProps.password} />
      <Form.TextField title="Websites Limit" placeholder="50" {...itemProps.websitesLimit} />
      <Form.TextField
        title="Selected ACL"
        placeholder="user | admin | custom"
        info="Access Control Level"
        {...itemProps.selectedACL}
      />
    </Form>
  );
}
