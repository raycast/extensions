import { Action, ActionPanel, Form, Icon, Toast, closeMainWindow, open, showHUD, showToast } from "@raycast/api";
import { useState } from "react";
import { CreateInstancePayload, createInstance } from "./lib/api";
import { usePreferencesCheck } from "./lib/usePreferencesCheck";

type Values = {
  instanceName: string;
  integration: "WHATSAPP-BAILEYS" | "WHATSAPP-BUSINESS" | "EVOLUTION";
  qrcode: boolean;
};

export default function Command() {
  const { isValid, isChecking } = usePreferencesCheck();
  const [submitting, setSubmitting] = useState(false);

  if (isChecking) {
    return <Form isLoading={true} />;
  }

  if (!isValid) {
    return <Form isLoading={false} />;
  }

  async function handleSubmit(values: Values) {
    setSubmitting(true);
    try {
      const payload: CreateInstancePayload = {
        instanceName: values.instanceName,
        integration: values.integration,
        qrcode: values.qrcode,
      };
      await createInstance(payload);
      await showHUD("Instance created");
      await closeMainWindow();
      await showToast({ style: Toast.Style.Success, title: "Instance created" });
    } catch (e) {
      const message = (e as { message?: string })?.message || "Failed to create instance";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle="Create Evolution Instance"
      actions={
        <ActionPanel title="Instance Actions">
          <Action.SubmitForm title="Create" onSubmit={handleSubmit} icon={Icon.Plus} />
          <Action.OpenInBrowser title="Open Swagger" url="http://localhost:8080/docs" />
          <Action title="Open Manager" onAction={() => open("http://localhost:8080/manager")} icon={Icon.Globe} />
        </ActionPanel>
      }
      isLoading={submitting}
    >
      <Form.Description text="Create a WhatsApp instance (Evolution API)." />
      <Form.TextField id="instanceName" title="Instance Name" placeholder="e.g. my-business" autoFocus />
      <Form.Dropdown id="integration" title="Integration" defaultValue="WHATSAPP-BAILEYS">
        <Form.Dropdown.Item value="WHATSAPP-BAILEYS" title="WhatsApp Baileys" />
        <Form.Dropdown.Item value="WHATSAPP-BUSINESS" title="WhatsApp Business" />
        <Form.Dropdown.Item value="EVOLUTION" title="Evolution" />
      </Form.Dropdown>
      <Form.Checkbox id="qrcode" title="QR Code" label="Request QR code immediately" defaultValue={true} />
    </Form>
  );
}
