import { ActionPanel, Action, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { SecretManagerService } from "../SecretManagerService";

interface AddVersionFormProps {
  secretId: string;
  projectId: string;
  gcloudPath: string;
  onVersionAdded: () => void;
}

export default function AddVersionForm({ secretId, projectId, gcloudPath, onVersionAdded }: AddVersionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [valueError, setValueError] = useState<string | undefined>();
  const { pop } = useNavigation();

  function handleValueChange(value: string) {
    if (!value.trim()) {
      setValueError("Secret value cannot be empty");
    } else {
      setValueError(undefined);
    }
  }

  async function handleSubmit(values: { value: string }) {
    if (!values.value.trim()) {
      showFailureToast("Validation Error", {
        title: "Invalid Secret Value",
        message: "Secret value cannot be empty",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const service = new SecretManagerService(gcloudPath, projectId);
      const success = await service.addVersion(secretId, values.value);

      if (success) {
        showToast({
          style: Toast.Style.Success,
          title: "Version added",
          message: `New version has been added to secret "${secretId}"`,
        });
        onVersionAdded();
        pop();
      } else {
        showFailureToast({
          title: "Failed to add version",
          message: "Version creation failed. Please check your permissions and try again.",
        });
      }
    } catch (error) {
      console.error("Failed to add version:", error);
      showFailureToast({
        title: "Failed to add version",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle={`Add Version - ${secretId}`}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Version" icon="➕" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={pop} shortcut={{ modifiers: ["cmd"], key: "k" }} />
        </ActionPanel>
      }
    >
      <Form.Description title="Secret" text={`Adding a new version to: ${secretId}`} />

      <Form.TextArea
        id="value"
        title="New Secret Value"
        placeholder="Enter the new secret value here..."
        error={valueError}
        onChange={handleValueChange}
        enableMarkdown={false}
        info="This will create a new version of the secret with this value"
      />

      <Form.Separator />

      <Form.Description
        title="Version Management"
        text="• A new version will be created and become the latest version
• Previous versions will remain accessible
• The new version will be enabled by default
• You can manage version states (enable/disable/destroy) from the detail view"
      />

      <Form.Description
        title="Security Notice"
        text="• Secret values are encrypted and stored securely
• All version changes are logged and audited
• Consider disabling or destroying old versions when no longer needed"
      />
    </Form>
  );
}
