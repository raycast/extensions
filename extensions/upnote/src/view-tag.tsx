import { Form, ActionPanel, Action } from "@raycast/api";
import { exec } from "child_process";
type Values = {
  tag: string;
};

export default function Command() {
  function handleSubmit(values: Values) {
    const cmd = `open 'upnote://x-callback-url/tag/view?tag=${values.tag}'`;
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
      <Form.TextField id="tag" title="Tag Title" placeholder="Enter text" />
    </Form>
  );
}
