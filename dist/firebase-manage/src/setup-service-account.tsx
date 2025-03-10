import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { saveServiceAccount, validateServiceAccount } from "./utils/firebase";

interface SetupServiceAccountProps {
  onComplete?: () => void;
}

export default function Command({ onComplete }: SetupServiceAccountProps = {}) {
  const [serviceAccountJson, setServiceAccountJson] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>();
  const { pop } = useNavigation();

  async function handleSubmit() {
    if (!serviceAccountJson.trim()) {
      setError("Service account JSON is required");
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      // Validate the service account JSON
      const serviceAccount = validateServiceAccount(serviceAccountJson);
      if (!serviceAccount) {
        setError("Invalid service account JSON. Please check the format and required fields.");
        setIsLoading(false);
        return;
      }

      // Save the service account
      const success = await saveServiceAccount(serviceAccountJson);
      if (!success) {
        setError("Failed to save service account. Please try again.");
        setIsLoading(false);
        return;
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Service Account Configured",
        message: `Project: ${serviceAccount.project_id}`,
      });

      // Call the onComplete callback if provided
      if (onComplete) {
        onComplete();
      } else {
        // Close the form
        pop();
      }
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Error setting up service account:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Service Account" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.Description
        title="Firebase Service Account Setup"
        text="Paste your Firebase service account JSON below. You can generate a new service account key from the Firebase Console > Project Settings > Service Accounts > Generate new private key."
      />
      <Form.TextArea
        id="serviceAccountJson"
        title="Service Account JSON"
        placeholder='{"type": "service_account", "project_id": "your-project-id", ...}'
        value={serviceAccountJson}
        onChange={setServiceAccountJson}
        error={error}
        autoFocus
      />
      <Form.Description
        text="Your service account credentials will be stored locally and used to authenticate with Firebase. You can reset these credentials later from the extension settings."
      />
    </Form>
  );
} 