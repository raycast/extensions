import { useState } from "react";
import { ActionPanel, Action, Form, showToast, Toast, LocalStorage } from "@raycast/api";

interface ApiKeySetupFormProps {
  onApiKeySaved: (apiKey: string) => void;
}

export function ApiKeySetupForm({ onApiKeySaved }: ApiKeySetupFormProps) {
  const [apiKey, setApiKey] = useState("");

  const handleSubmit = async () => {
    if (!apiKey.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid API Key",
        message: "Please enter a valid Tenor API key",
      });
      return;
    }

    try {
      // Save the API key to LocalStorage
      await LocalStorage.setItem("tenorApiKey", apiKey.trim());

      await showToast({
        style: Toast.Style.Success,
        title: "API Key Saved",
        message: "API key saved successfully!",
      });

      // Notify parent component that API key was saved
      onApiKeySaved(apiKey.trim());
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Save API Key",
        message: "Please try again or configure it manually in preferences",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Save Api Key" onAction={handleSubmit} />
          <Action.OpenInBrowser title="Get Tenor Api Key" url="https://console.cloud.google.com/" />
        </ActionPanel>
      }
    >
      <Form.Description text="To use this extension, you need a Tenor API key from Google Cloud Console." />
      <Form.TextField
        id="apiKey"
        title="Tenor API Key"
        placeholder="Enter your Tenor API key here"
        value={apiKey}
        onChange={setApiKey}
        info="You can get a free API key from Google Cloud Console by enabling the Tenor API"
      />
      <Form.Description text="You can also configure the API key in Raycast preferences if you prefer." />
    </Form>
  );
}
