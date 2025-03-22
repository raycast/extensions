import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { createFTPAccount } from "../../utils/api";
import { CreateFTPAccountFormValues } from "../../types/ftp-accounts";

type CreateFTPAccountProps = {
  initialFTPDomain: string;
  onFTPAccountCreated: () => void;
};
export default function CreateFTPAccount({ initialFTPDomain, onFTPAccountCreated }: CreateFTPAccountProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<CreateFTPAccountFormValues>({
    async onSubmit(values) {
      const response = await createFTPAccount({ ...values });
      if (response.error_message === "None") {
        await showToast(Toast.Style.Success, "SUCCESS", `Created FTP Account '${values.ftpUserName}' successfully`);
        onFTPAccountCreated();
        pop();
      }
    },
    initialValues: {
      ftpDomain: initialFTPDomain,
    },
    validation: {
      ftpDomain: FormValidation.Required,
      ftpUserName: FormValidation.Required,
      passwordByPass: FormValidation.Required,
    },
  });
  return (
    <Form
      navigationTitle="Create FTP Account"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Domain" placeholder="example.local" {...itemProps.ftpDomain} />
      <Form.TextField title="Username" placeholder="example_user" {...itemProps.ftpUserName} />
      <Form.PasswordField title="Password" placeholder="hunter2" {...itemProps.passwordByPass} />
      <Form.TextField title="Path" placeholder="Leave empty to select default home directory" {...itemProps.path} />
    </Form>
  );
}
