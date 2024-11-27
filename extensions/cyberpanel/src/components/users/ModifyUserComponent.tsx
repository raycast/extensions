import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { ModifyUserFormValues, User } from "../../types/users";
import { FormValidation, useForm } from "@raycast/utils";
import { modifyUser } from "../../utils/api";

type ModifyUserProps = {
  user: User;
  onUserModified: () => void;
};
export default function ModifyUser({ user, onUserModified }: ModifyUserProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<ModifyUserFormValues>({
    async onSubmit(values) {
      const response = await modifyUser({ ...values, twofa: values.twofa ? 0 : 1, accountUsername: user.userName });
      if (response.error_message === "None") {
        await showToast(Toast.Style.Success, "SUCCESS", `Modified ${user.userName} successfully`);
        onUserModified();
        pop();
      }
    },
    initialValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    },
    validation: {
      firstName: FormValidation.Required,
      lastName: FormValidation.Required,
      email: FormValidation.Required,
    },
  });
  return (
    <Form
      navigationTitle={`Modify ${user.userName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextField title="First Name" placeholder="Raycast" {...itemProps.firstName} />
      <Form.TextField title="Last Name" placeholder="User" {...itemProps.lastName} />
      <Form.TextField title="Email" placeholder="user@raycast.local" {...itemProps.email} />
      <Form.PasswordField title="New Password" placeholder="hunter2" {...itemProps.passwordByPass} />
      <Form.TextField title="New Security Level" placeholder="LOW" {...itemProps.securityLevel} />
      <Form.Checkbox label="New 2FA Status" {...itemProps.twofa} />
    </Form>
  );
}
