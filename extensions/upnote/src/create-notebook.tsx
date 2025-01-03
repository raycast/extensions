import { Form, ActionPanel, Action } from "@raycast/api";
import { exec } from "child_process";

type Values = {
  notebook: string;
};

export default function Command() {
  function handleSubmit(values: Values) {
    const cmd = `open 'upnote://x-callback-url/notebook/new?title=${values.notebook}'`;
    exec(cmd);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="notebook" title="Notebook" placeholder="Enter text" />
    </Form>
  );
}
