import { Action, ActionPanel, Form, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { tophubApiKey } from "../types/preferences";

export function ApiKeyForm({ onApiKeySaved }: { onApiKeySaved: () => void }) {
  const [apiKey, setApiKey] = useState<string>(tophubApiKey || "");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function handleSubmit() {
    if (!apiKey.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Key cannot be empty",
        message: "Please input a valid Tophub API Key",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Open extension preferences so the user can save the API Key
      await openExtensionPreferences();

      await showToast({
        style: Toast.Style.Success,
        title: "Please save your API Key in settings",
        message: "Press Command+Enter to save settings",
      });

      // Call the callback function
      onApiKeySaved();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save API Key",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save API Key and Open Settings" onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            title="Get API Key"
            url="https://www.tophubdata.com"
            shortcut={{ modifiers: ["cmd"], key: "h" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Configure Tophub API Key"
        text="You need to get an API Key from tophub.today to use this extension. Please enter your API Key below, then press Command+Enter to save."
      />
      <Form.PasswordField
        id="apiKey"
        title="Tophub API Key"
        placeholder="Enter your Tophub API Key"
        value={apiKey}
        onChange={setApiKey}
      />
      <Form.Description
        title=""
        text="Tip: After saving, press Command+Enter again in the settings page to confirm. If you don't have an API Key yet, click the 'Get API Key' button in the top right to visit the official website."
      />
    </Form>
  );
}
