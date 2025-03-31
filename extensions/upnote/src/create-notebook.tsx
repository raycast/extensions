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
      <Form.Description text="Empty form will bring up UpNote with a new notebook." />
      <Form.TextField id="notebook" title="Notebook" placeholder="Enter text" />
    </Form>
  );
}
