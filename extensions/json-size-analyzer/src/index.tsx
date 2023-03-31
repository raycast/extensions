import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";

type Values = {
  json: string;
};

export default function Command() {
  function handleSubmit(values: Values) {
    try {
      const jsonSize = Buffer.byteLength(JSON.stringify(JSON.parse(values.json)));
      showToast({ title: "JSON size", message: `${jsonSize} bytes` });
    } catch (error) {
      showToast({
        title: "Invalid JSON",
        message: "Ensure that the JSON you provided is correct",
        style: Toast.Style.Failure,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Paste your JSON here to get the size in bytes" />
      <Form.TextField id="json" title="JSON" placeholder="Enter JSON" defaultValue={"{}"} />
    </Form>
  );
}
