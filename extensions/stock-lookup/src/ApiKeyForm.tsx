import { Action, ActionPanel, Form, LocalStorage } from "@raycast/api";

export function ApiKeyForm({ testApiKey }: { testApiKey: () => void }) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            shortcut={{
              key: "enter",
              modifiers: [],
            }}
            onSubmit={async (values) => {
              await LocalStorage.setItem("apiKey", values.apiKey);
              testApiKey();
            }}
          />
          <Action.OpenInBrowser
            url="https://www.alphavantage.co/support/#api-key"
            title="Get a free API Key from alphavantage.co"
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="apiKey" placeholder="API Key" title="API Key" autoFocus={true} storeValue={true} />
      <Form.Description
        text={`This extension uses the Alphavantage Stock API for market information. Go to https://www.alphavantage.co/support/#api-key for a free API Key and paste it in the text field above.\n\nPress ⌘ + ⇧ + ↵ to go to the link.`}
      />
    </Form>
  );
}
