import { Form, LocalStorage, ActionPanel, Action, showToast, Toast } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Changes"
            onSubmit={async (values) => {
              await LocalStorage.setItem("format", values["format"]);
              showToast(Toast.Style.Success, "Output format changed to", values["format"]);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="format" title="Output Format" filtering={false} storeValue={true}>
        <Form.Dropdown.Item value="md" title="Markdown" />
        <Form.Dropdown.Item value="latex" title="LaTeX" />
      </Form.Dropdown>
    </Form>
  );
}
