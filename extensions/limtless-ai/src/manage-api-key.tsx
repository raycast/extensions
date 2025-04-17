import { Form, ActionPanel, Action, showToast, Toast, useNavigation, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { LimitlessAPI } from "./utils/api";
import { LocalStorage } from "@raycast/api";

interface Preferences {
  limitlessApiKey?: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [apiKey, setApiKey] = useState<string>(preferences.limitlessApiKey || "");
  const { pop } = useNavigation();
  const api = LimitlessAPI.getInstance();

  async function handleSubmit(values: { apiKey: string }) {
    try {
      // Save the API key in LocalStorage
      await LocalStorage.setItem("limitlessApiKey", values.apiKey);

      // Update the API instance
      api.setApiKey(values.apiKey);

      // Show success toast
      await showToast({
        style: Toast.Style.Success,
        title: "API key saved",
        message: "Your Limitless API key has been saved.",
      });

      // Go back to previous screen
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save API key",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Api Key" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter your Limitless AI API key to access your pendant's lifelogs." />
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        placeholder="Enter your Limitless API key"
        value={apiKey}
        onChange={setApiKey}
        info="Your API key can be found in your Limitless account settings"
      />
      <Form.Description text="Your API key is stored securely in Raycast preferences and is only used to access your Limitless data." />
    </Form>
  );
}
