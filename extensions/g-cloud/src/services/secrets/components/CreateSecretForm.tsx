import { ActionPanel, Action, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { SecretManagerService } from "../SecretManagerService";

interface CreateSecretFormProps {
  projectId: string;
  gcloudPath: string;
  onSecretCreated: () => void;
}

function validateSecretId(secretId: string): { isValid: boolean; error?: string } {
  if (!secretId) {
    return { isValid: false, error: "Secret ID is required" };
  }

  if (secretId.length < 1 || secretId.length > 255) {
    return { isValid: false, error: "Secret ID must be between 1 and 255 characters" };
  }

  // Must start with a letter or underscore
  if (!/^[a-zA-Z_]/.test(secretId)) {
    return { isValid: false, error: "Secret ID must start with a letter or underscore" };
  }

  // Can only contain letters, numbers, underscores, and hyphens
  if (!/^[a-zA-Z0-9_-]+$/.test(secretId)) {
    return {
      isValid: false,
      error: "Secret ID can only contain letters, numbers, underscores, and hyphens",
    };
  }

  return { isValid: true };
}

export default function CreateSecretForm({ projectId, gcloudPath, onSecretCreated }: CreateSecretFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [valueError, setValueError] = useState<string | undefined>();
  const { pop } = useNavigation();

  function handleNameChange(secretId: string) {
    const validation = validateSecretId(secretId);
    setNameError(validation.error);
  }

  function handleValueChange(value: string) {
    if (!value.trim()) {
      setValueError("Secret value cannot be empty");
    } else {
      setValueError(undefined);
    }
  }

  async function handleSubmit(values: { secretId: string; value: string; description?: string }) {
    const nameValidation = validateSecretId(values.secretId);
    if (!nameValidation.isValid) {
      showFailureToast("Validation Error", {
        title: "Invalid Secret ID",
        message: nameValidation.error || "Please check secret ID requirements",
      });
      return;
    }

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
      const success = await service.createSecret(values.secretId, values.value);

      if (success) {
        showToast({
          style: Toast.Style.Success,
          title: "Secret created",
          message: `Secret "${values.secretId}" has been created successfully`,
        });
        onSecretCreated();
        pop();
      } else {
        showFailureToast({
          title: "Failed to create secret",
          message: "Secret creation failed. Please check your permissions and try again.",
        });
      }
    } catch (error) {
      console.error("Failed to create secret:", error);
      showFailureToast({
        title: "Failed to create secret",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle="Create Secret"
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Secret" icon="🔒" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={pop} shortcut={{ modifiers: ["cmd"], key: "k" }} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="secretId"
        title="Secret ID"
        placeholder="my-secret"
        error={nameError}
        onChange={handleNameChange}
        info="Must start with a letter or underscore, and contain only letters, numbers, underscores, and hyphens"
      />

      <Form.TextArea
        id="value"
        title="Secret Value"
        placeholder="Enter your secret value here..."
        error={valueError}
        onChange={handleValueChange}
        enableMarkdown={false}
        info="The initial value for this secret. This will be stored securely in Google Cloud."
      />

      <Form.TextField
        id="description"
        title="Description (Optional)"
        placeholder="Brief description of this secret"
        info="Optional description to help identify the purpose of this secret"
      />

      <Form.Separator />

      <Form.Description
        title="Security Notice"
        text="• Secret values are encrypted and stored securely in Google Cloud
• Access is logged and audited
• Consider using least-privilege IAM policies
• Review and rotate secrets regularly"
      />
    </Form>
  );
}
