import { Form, ActionPanel, Action, showToast } from "@raycast/api";
import { CONFIG_STORAGE_KEY } from "./const";
import { Config, Provider } from "./types";
import { useLocalStorage } from "@raycast/utils";

export default function Settings() {
  const { setValue } = useLocalStorage<Config>(CONFIG_STORAGE_KEY);

  function handleSubmit(values: Config) {
    setValue(values);

    showToast({ title: "Preferences saved", message: "You can now use the extension!" });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Preferences" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Configure the extension to use your API key and provider. All data is stored locally." />
      <Form.TextField id="apiKey" title="API Key" placeholder="Enter your API key" storeValue />
      <Form.Dropdown id="provider" title="Provider" storeValue>
        {Object.values(Provider).map((provider) => (
          <Form.Dropdown.Item key={provider} value={provider} title={provider} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
