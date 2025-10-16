import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { createDatabase } from "../../utils/api";
import { CreateDatabaseFormValues } from "../../types/databases";

type CreateDatabaseProps = {
  initialDatabaseWebsite: string;
  onDatabaseCreated: () => void;
};
export default function CreateDatabase({ initialDatabaseWebsite, onDatabaseCreated }: CreateDatabaseProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<CreateDatabaseFormValues>({
    async onSubmit(values) {
      const response = await createDatabase({ ...values });
      if (response.error_message === "None") {
        await showToast(Toast.Style.Success, "SUCCESS", `Created Database '${values.dbName}' successfully`);
        onDatabaseCreated();
        pop();
      }
    },
    initialValues: {
      databaseWebsite: initialDatabaseWebsite,
    },
    validation: {
      databaseWebsite: FormValidation.Required,
      dbName: FormValidation.Required,
      dbUsername: FormValidation.Required,
      dbPassword: FormValidation.Required,
      webUserName: FormValidation.Required,
    },
  });
  return (
    <Form
      navigationTitle="Create Database"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Domain" placeholder="example.local" {...itemProps.databaseWebsite} />
      <Form.TextField title="Database Name" placeholder="wordpress_database" {...itemProps.dbName} />
      <Form.TextField title="Database Username" placeholder="wordpress_user" {...itemProps.dbUsername} />
      <Form.PasswordField title="Database Password" placeholder="hunter2" {...itemProps.dbPassword} />
      <Form.TextField title="Web Username" placeholder="wp" {...itemProps.webUserName} />
    </Form>
  );
}
