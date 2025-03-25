// src/set-api-key.tsx
import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { storeApiKey, validateApiKey } from "./api-key";

export default function SetApiKeyCommand() {
  const handleSubmit = async (values: { apiKey: string }) => {
    try {
      // Validate the API key before storing
      const isValid = await validateApiKey(values.apiKey);

      if (isValid) {
        await storeApiKey(values.apiKey);
        await showToast({
          style: Toast.Style.Success,
          title: "API Key Validated",
          message: "Your Rize.io API key has been securely stored",
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid API Key",
          message: "The provided API key could not be validated",
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Key Setup Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save API Key" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Rize.io API Key"
        text="Enter your Rize.io API key to use this extension"
      />
      <Form.TextField
        id="apiKey"
        title="API Key"
        placeholder="Paste your Rize.io API key here"
        info="You can find your API key in your Rize.io account settings"
      />
    </Form>
  );
}
