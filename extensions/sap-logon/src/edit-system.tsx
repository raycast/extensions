import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation, usePromise } from "@raycast/utils";
import { useCallback, useEffect } from "react";
import { LanguageDropdown } from "./components";
import { SAPSystem, SAPSystemFormValues, SystemType } from "./types";
import {
  getPassword,
  SYSTEM_TYPE_LABELS,
  SYSTEM_TYPES,
  updateSAPSystem,
  validateApplicationServer,
  validateClient,
  validateInstanceNumber,
  validatePassword,
  validateUsername,
} from "./utils";

interface EditSystemFormProps {
  system: SAPSystem;
  onSave: () => void;
}

export default function EditSystemForm({ system, onSave }: EditSystemFormProps) {
  const { pop } = useNavigation();

  const { data: currentPassword, isLoading: isLoadingPassword } = usePromise(getPassword, [system.id]);

  const { handleSubmit, itemProps, setValue } = useForm<SAPSystemFormValues>({
    onSubmit: async (values) => {
      try {
        await updateSAPSystem(
          system.id,
          {
            customerName: values.customerName.trim(),
            systemId: values.systemId.trim().toUpperCase(),
            systemType: values.systemType as SystemType,
            applicationServer: values.applicationServer.trim(),
            instanceNumber: values.instanceNumber.trim(),
            client: values.client.trim(),
            username: values.username.trim(),
            language: values.language,
          },
          values.password,
        );

        await showToast({
          style: Toast.Style.Success,
          title: "System Updated",
          message: `${values.systemId} has been updated`,
        });

        onSave();
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Update Failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    initialValues: {
      customerName: system.customerName,
      systemId: system.systemId,
      systemType: system.systemType,
      applicationServer: system.applicationServer,
      instanceNumber: system.instanceNumber,
      client: system.client,
      username: system.username,
      language: system.language,
    },
    validation: {
      customerName: FormValidation.Required,
      systemId: FormValidation.Required,
      applicationServer: (value) => {
        if (!value) return "Application server is required";
        return validateApplicationServer(value);
      },
      instanceNumber: (value) => {
        if (!value) return "Instance number is required";
        return validateInstanceNumber(value);
      },
      client: (value) => {
        if (!value) return "Client is required";
        return validateClient(value);
      },
      username: (value) => {
        if (!value) return "Username is required";
        return validateUsername(value);
      },
      password: (value) => {
        if (!value) return "Password is required";
        return validatePassword(value);
      },
    },
  });

  const setPasswordValue = useCallback((password: string) => setValue("password", password), [setValue]);

  useEffect(() => {
    if (currentPassword) {
      setPasswordValue(currentPassword);
    }
  }, [currentPassword, setPasswordValue]);

  return (
    <Form
      isLoading={isLoadingPassword}
      navigationTitle={`Edit ${system.systemId}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description title="Edit SAP System" text="Update the configuration for this SAP system connection." />

      <Form.TextField
        {...itemProps.customerName}
        title="Customer"
        placeholder="Acme Corp, Müller GmbH..."
        info="The customer this system belongs to. Used to group and search systems."
      />

      <Form.TextField
        {...itemProps.systemId}
        title="System ID"
        placeholder="PRD, DEV, QAS..."
        info="The SAP System ID (SID), typically 3 characters"
      />

      <Form.Dropdown {...itemProps.systemType} title="System Type">
        {SYSTEM_TYPES.map((type) => (
          <Form.Dropdown.Item key={type} value={type} title={`${type} – ${SYSTEM_TYPE_LABELS[type]}`} />
        ))}
      </Form.Dropdown>

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

      <LanguageDropdown {...itemProps.language} title="Language" allowAsk />

      <Form.Description title="Last Updated" text={new Date(system.updatedAt).toLocaleString()} />
    </Form>
  );
}
