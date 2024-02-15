import { Form, LocalStorage, ActionPanel, Action, showToast, Toast } from "@raycast/api";

export default function SetOpenAIKey() {
  async function handleSubmit(values: { apiKey: string }) {
    try {
      await LocalStorage.setItem("openai_api_key", values.apiKey);
      showToast({ title: "Success", message: "OpenAI API Key saved", style: Toast.Style.Success });
    } catch (error) {
      showToast({ title: "Error", message: "Failed to save OpenAI API Key", style: Toast.Style.Failure });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save OpenAI API Key" onSubmit={handleSubmit} />
        </ActionPanel>
      }>
      <Form.TextField id="apiKey" title="OpenAI API Key" placeholder="Enter your OpenAI API Key here" />
    </Form>
  );
}
