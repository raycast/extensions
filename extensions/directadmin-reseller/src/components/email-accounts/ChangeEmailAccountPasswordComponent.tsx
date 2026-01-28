import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { ChangeEmailAccountPasswordRequest, SuccessResponse } from "../../types";
import { changeEmailAccountPassword } from "../../utils/api";

type ChangeEmailAccountPasswordComponentProps = {
  email: string;
  onEmailAccountPasswordChanged: () => void;
  userToImpersonate?: string;
};
export default function ChangeEmailAccountPasswordComponent({
  email,
  onEmailAccountPasswordChanged,
  userToImpersonate = "",
}: ChangeEmailAccountPasswordComponentProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<ChangeEmailAccountPasswordRequest>({
    async onSubmit(values) {
      const response = await changeEmailAccountPassword({ ...values, email, api: true }, userToImpersonate);

      if (response.error === "0") {
        const data = response as SuccessResponse;
        await showToast(Toast.Style.Success, data.text, data.details);
        onEmailAccountPasswordChanged();
        pop();
      }
    },
    validation: {
      oldpassword: FormValidation.Required,
      password1(value) {
        if (!value) return "The item is required";
        else if (itemProps.password2.value && itemProps.password2.value !== value) return "Passwords do not match";
      },
      password2(value) {
        if (!value) return "The item is required";
        else if (itemProps.password1.value && itemProps.password1.value !== value) return "Passwords do not match";
      },
    },
  });

  return (
    <Form
      navigationTitle="Change Email Account Password"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Email" text={email} />
      <Form.PasswordField title="Old Password" placeholder="hunter1" {...itemProps.oldpassword} />
      <Form.PasswordField title="New Password" placeholder="hunter2" {...itemProps.password1} />
      <Form.PasswordField title="Repeat New Password" placeholder="hunter2" {...itemProps.password2} />
    </Form>
  );
}
