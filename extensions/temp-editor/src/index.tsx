import { Action, ActionPanel, Clipboard, Form, popToRoot, showHUD } from "@raycast/api";

export default function Command() {
  async function handleSubmit(values: { text: string }) {
    if (!values.text) {
      return;
    }
    await Clipboard.copy(values.text);
    await showHUD("Copied to clipboard");
    await popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy to Clipboard" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title="Text" placeholder="Type text here..." autoFocus />
    </Form>
  );
}
