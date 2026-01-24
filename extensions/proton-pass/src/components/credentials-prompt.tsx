import { ProtonBackupFormData, ProtonBackupFormProps } from "../api/proton-pass";
import { useForm, FormValidation } from "@raycast/utils";
import { Form, ActionPanel, Action } from "@raycast/api";

export function ProtonBackupForm({ localStorageSetter }: ProtonBackupFormProps) {
  const { handleSubmit, itemProps } = useForm<ProtonBackupFormData>({
    onSubmit: function (userBackupData) {
      localStorageSetter(userBackupData);
    },
    validation: {
      filePath: FormValidation.Required,
      password: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Data" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker title="Proton Pass Backup File" allowMultipleSelection={false} {...itemProps.filePath} />
      <Form.PasswordField title="Password" {...itemProps.password} />
    </Form>
  );
}
