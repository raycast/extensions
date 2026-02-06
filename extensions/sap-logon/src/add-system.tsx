import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { LanguageDropdown } from "./components";
import { SAPSystemFormValues } from "./types";
import { addSAPSystem, validateClient, validateInstanceNumber } from "./utils";

interface AddSystemFormProps {
  onSave?: () => void;
}

export function AddSystemForm({ onSave }: AddSystemFormProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<SAPSystemFormValues>({
    onSubmit: async (values) => {
      try {
        await addSAPSystem(
          {
            systemId: values.systemId.trim().toUpperCase(),
            applicationServer: values.applicationServer.trim(),
            instanceNumber: values.instanceNumber.trim(),
            client: values.client.trim(),
            username: values.username.trim(),
            language: values.language || "EN",
          },
          values.password,
        );

        await showToast({
          style: Toast.Style.Success,
          title: "System Added",
          message: `${values.systemId} has been saved`,
        });

        onSave?.();
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Add System",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    initialValues: {
      language: "EN",
    },
    validation: {
      systemId: FormValidation.Required,
      applicationServer: FormValidation.Required,
      instanceNumber: (value) => {
        if (!value) return "Instance number is required";
        return validateInstanceNumber(value);
      },
      client: (value) => {
        if (!value) return "Client is required";
        return validateClient(value);
      },
      username: FormValidation.Required,
      password: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle="Add SAP System"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add System" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="New SAP System"
        text="Enter the connection details for your SAP system. The password will be stored encrypted."
      />

      <Form.TextField
        {...itemProps.systemId}
        title="System ID"
        placeholder="PRD, DEV, QAS..."
        info="The SAP System ID (SID), typically 3 characters"
      />

      <Form.TextField
        {...itemProps.applicationServer}
        title="Application Server"
        placeholder="sap-server.company.com"
        info="Hostname or IP address of the SAP application server"
      />

      <Form.TextField
        {...itemProps.instanceNumber}
        title="Instance Number"
        placeholder="00"
        info="2-digit instance number (e.g., 00, 01)"
      />

      <Form.TextField
        {...itemProps.client}
        title="Client"
        placeholder="100"
        info="3-digit client number (e.g., 100, 800)"
      />

      <Form.Separator />

      <Form.TextField {...itemProps.username} title="Username" placeholder="Your SAP username" />

      <Form.PasswordField
        {...itemProps.password}
        title="Password"
        placeholder="Your SAP password"
        info="Password is stored encrypted locally"
      />

      <Form.Separator />

      <LanguageDropdown {...itemProps.language} title="Language" />
    </Form>
  );
}

export default function Command() {
  return <AddSystemForm />;
}
